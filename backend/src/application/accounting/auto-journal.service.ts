/**
 * Auto-journal service — generates journal entries automatically when
 * accountingEnabled = true for the company.
 *
 * Account codes used (from the seeded chart of accounts):
 *   1.1.01  Caja
 *   1.1.02  Banco CC
 *   1.1.04  Mercaderías
 *   1.1.05  IVA Crédito Fiscal
 *   1.1.06  Deudores por Ventas
 *   2.1.01  Proveedores
 *   2.1.02  IVA Débito Fiscal
 *   2.1.03  Sueldos a Pagar (note: DB has 2.1.04)
 *   2.1.04  Sueldos a Pagar
 *   2.1.05  Cargas Sociales a Pagar
 *   4.1.01  Ventas
 *   5.1.02  Sueldos y Jornales
 *   5.1.03  Cargas Sociales Patronales
 */

import { prisma } from "../../config/database/prisma";
import { PaymentMethod } from "@prisma/client";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export class AutoJournalService {
  /** Check if accounting is enabled for a company */
  private async isEnabled(companyId: number): Promise<boolean> {
    const c = await prisma.company.findUnique({ where: { id: companyId }, select: { accountingEnabled: true } });
    return c?.accountingEnabled ?? false;
  }

  /** Lookup account id by code, returns null if not found */
  private async accountId(companyId: number, code: string): Promise<number | null> {
    const acc = await prisma.account.findFirst({ where: { companyId, code, active: true } });
    return acc?.id ?? null;
  }

  /** Lookup multiple accounts by code in one query */
  private async accounts(companyId: number, codes: string[]): Promise<Map<string, number>> {
    const accs = await prisma.account.findMany({
      where: { companyId, code: { in: codes }, active: true },
      select: { id: true, code: true },
    });
    return new Map(accs.map((a) => [a.code, a.id]));
  }

  /**
   * Create journal entry for a sale.
   * DEBE: Caja (cash) / Banco (card) / Deudores (credit) → total
   * HABER: Ventas → subtotal (without tax)
   * HABER: IVA DF → tax
   *
   * Called after the sale is committed. Fire-and-forget — errors are silently logged.
   */
  async onSaleCreated(params: {
    companyId: number;
    createdBy: number;
    saleId: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    taxTotal?: number;
    description?: string;
  }) {
    try {
      if (!(await this.isEnabled(params.companyId))) return;

      const accs = await this.accounts(params.companyId, ["1.1.01", "1.1.02", "1.1.06", "2.1.02", "4.1.01"]);

      const cajaId = accs.get("1.1.01");
      const bancoId = accs.get("1.1.02");
      const deudoresId = accs.get("1.1.06");
      const ivadfId = accs.get("2.1.02");
      const ventasId = accs.get("4.1.01");

      if (!ventasId) return; // Chart of accounts not seeded

      const total = round2(params.totalAmount);
      const tax = round2(params.taxTotal ?? 0);
      const subtotal = round2(total - tax);

      // Debit account depends on payment method
      let debitAccountId: number | null = null;
      if (params.paymentMethod === "CASH") debitAccountId = cajaId ?? null;
      else if (params.paymentMethod === "CARD") debitAccountId = bancoId ?? null;
      else if (params.paymentMethod === "CREDIT") debitAccountId = deudoresId ?? null;
      else debitAccountId = cajaId ?? null; // MIXED → Caja as default

      if (!debitAccountId) return;

      const lines: { accountId: number; debit: number; credit: number; description?: string }[] = [
        { accountId: debitAccountId, debit: total, credit: 0, description: `Cobro venta #${params.saleId}` },
        { accountId: ventasId, debit: 0, credit: subtotal > 0 ? subtotal : total, description: "Ventas" },
      ];

      if (tax > 0 && ivadfId) {
        lines.push({ accountId: ivadfId, debit: 0, credit: tax, description: "IVA Débito Fiscal" });
      }

      await prisma.journalEntry.create({
        data: {
          companyId: params.companyId,
          createdBy: params.createdBy,
          date: new Date(),
          description: params.description ?? `Venta #${params.saleId}`,
          reference: `SALE-${params.saleId}`,
          sourceType: "SALE",
          sourceId: params.saleId,
          isAutomatic: true,
          status: "POSTED",
          lines: { create: lines },
        },
      });
    } catch (err) {
      console.error("[AutoJournal] onSaleCreated error:", err);
    }
  }

  /**
   * Create journal entry for a received purchase order.
   * DEBE: Mercaderías → subtotal
   * DEBE: IVA CF → tax (if any)
   * HABER: Proveedores → total
   */
  async onPurchaseReceived(params: {
    companyId: number;
    createdBy: number;
    purchaseOrderId: number;
    total: number;
    taxAmount?: number;
    description?: string;
  }) {
    try {
      if (!(await this.isEnabled(params.companyId))) return;

      const accs = await this.accounts(params.companyId, ["1.1.04", "1.1.05", "2.1.01"]);

      const mercId = accs.get("1.1.04");
      const ivacfId = accs.get("1.1.05");
      const provId = accs.get("2.1.01");

      if (!mercId || !provId) return;

      const total = round2(params.total);
      const tax = round2(params.taxAmount ?? 0);
      const net = round2(total - tax);

      const lines: { accountId: number; debit: number; credit: number; description?: string }[] = [
        { accountId: mercId, debit: tax > 0 ? net : total, credit: 0, description: "Compra mercaderías" },
      ];

      if (tax > 0 && ivacfId) {
        lines.push({ accountId: ivacfId, debit: tax, credit: 0, description: "IVA Crédito Fiscal" });
      }

      lines.push({ accountId: provId, debit: 0, credit: total, description: `OC #${params.purchaseOrderId}` });

      await prisma.journalEntry.create({
        data: {
          companyId: params.companyId,
          createdBy: params.createdBy,
          date: new Date(),
          description: params.description ?? `Compra OC #${params.purchaseOrderId}`,
          reference: `PO-${params.purchaseOrderId}`,
          sourceType: "PURCHASE",
          sourceId: params.purchaseOrderId,
          isAutomatic: true,
          status: "POSTED",
          lines: { create: lines },
        },
      });
    } catch (err) {
      console.error("[AutoJournal] onPurchaseReceived error:", err);
    }
  }

  /**
   * Create journal entry when a payroll is marked as PAID.
   * DEBE: Sueldos y Jornales → bruto
   * HABER: Sueldos a Pagar → neto
   * HABER: Cargas Sociales a Pagar → deducciones empleado
   *
   * DEBE: Cargas Sociales Patronales → patronalTotal
   * HABER: Cargas Sociales a Pagar → patronalTotal
   */
  async onPayrollPaid(params: {
    companyId: number;
    createdBy: number;
    payrollId: number;
    grossTotal: number;
    netSalary: number;
    totalDeductions: number;
    patronalTotal: number;
    employeeName: string;
    period: string;
  }) {
    try {
      if (!(await this.isEnabled(params.companyId))) return;

      const accs = await this.accounts(params.companyId, ["2.1.04", "2.1.05", "5.1.02", "5.1.03"]);

      const sueldosAPagarId = accs.get("2.1.04");
      const cargasAPagarId = accs.get("2.1.05");
      const sueldosGastoId = accs.get("5.1.02");
      const cargasGastoId = accs.get("5.1.03");

      if (!sueldosAPagarId || !sueldosGastoId) return;

      const lines: { accountId: number; debit: number; credit: number; description?: string }[] = [
        { accountId: sueldosGastoId, debit: round2(params.grossTotal), credit: 0, description: `Sueldo ${params.employeeName} ${params.period}` },
        { accountId: sueldosAPagarId, debit: 0, credit: round2(params.netSalary), description: "Neto a cobrar" },
      ];

      if (params.totalDeductions > 0 && cargasAPagarId) {
        lines.push({ accountId: cargasAPagarId, debit: 0, credit: round2(params.totalDeductions), description: "Aportes empleado (ANSES, OS, PAMI)" });
      }

      if (params.patronalTotal > 0 && cargasGastoId && cargasAPagarId) {
        lines.push({ accountId: cargasGastoId, debit: round2(params.patronalTotal), credit: 0, description: "Cargas patronales" });
        lines.push({ accountId: cargasAPagarId, debit: 0, credit: round2(params.patronalTotal), description: "Cargas patronales a pagar" });
      }

      await prisma.journalEntry.create({
        data: {
          companyId: params.companyId,
          createdBy: params.createdBy,
          date: new Date(),
          description: `Sueldo ${params.employeeName} — ${params.period}`,
          reference: `PAYROLL-${params.payrollId}`,
          sourceType: "PAYROLL",
          sourceId: params.payrollId,
          isAutomatic: true,
          status: "POSTED",
          lines: { create: lines },
        },
      });
    } catch (err) {
      console.error("[AutoJournal] onPayrollPaid error:", err);
    }
  }
}

export const autoJournal = new AutoJournalService();
