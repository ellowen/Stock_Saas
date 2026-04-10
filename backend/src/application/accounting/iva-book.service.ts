import { prisma } from "../../config/database/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IVAVentasRow {
  id: number;
  date: Date;
  type: string;
  number: number;
  customerName: string;
  customerCuit: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  // IVA per rate: { "21": 1000, "10.5": 200 }
  ivaByRate: Record<string, number>;
}

export interface IVAComprasRow {
  id: number;
  date: Date;
  number: number;
  supplierName: string;
  supplierCuit: string | null;
  total: number;
}

export interface IVAVentasTotals {
  subtotal: number;
  taxTotal: number;
  total: number;
  byRate: Record<string, number>; // rate → sum of IVA at that rate
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class IvaBookService {
  async getVentas(
    companyId: number,
    from?: Date,
    to?: Date
  ): Promise<{ rows: IVAVentasRow[]; totals: IVAVentasTotals }> {
    const dateFilter: any = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;

    const docs = await prisma.document.findMany({
      where: {
        companyId,
        type: { in: ["INVOICE", "CREDIT_NOTE"] },
        status: { in: ["ISSUED", "ACCEPTED"] },
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      include: {
        customer: { select: { name: true, taxId: true } },
        items: {
          include: { taxConfig: { select: { rate: true, name: true } } },
        },
      },
      orderBy: { date: "asc" },
    });

    const rows: IVAVentasRow[] = docs.map((doc) => {
      // Aggregate IVA per rate from items
      const ivaByRate: Record<string, number> = {};
      for (const item of doc.items) {
        if (item.taxConfig && Number(item.taxAmount) > 0) {
          const rateKey = (Number(item.taxConfig.rate) * 100).toFixed(2).replace(/\.00$/, "");
          ivaByRate[rateKey] = (ivaByRate[rateKey] ?? 0) + Number(item.taxAmount);
        }
      }

      return {
        id: doc.id,
        date: doc.date,
        type: doc.type,
        number: doc.number,
        customerName: doc.customer?.name ?? "Consumidor Final",
        customerCuit: doc.customer?.taxId ?? null,
        subtotal: Number(doc.subtotal),
        taxTotal: Number(doc.taxTotal),
        total: Number(doc.total),
        ivaByRate,
      };
    });

    const totals: IVAVentasTotals = {
      subtotal: rows.reduce((s, r) => s + r.subtotal, 0),
      taxTotal: rows.reduce((s, r) => s + r.taxTotal, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
      byRate: {},
    };
    for (const row of rows) {
      for (const [rate, amount] of Object.entries(row.ivaByRate)) {
        totals.byRate[rate] = (totals.byRate[rate] ?? 0) + amount;
      }
    }

    return { rows, totals };
  }

  async getCompras(
    companyId: number,
    from?: Date,
    to?: Date
  ): Promise<{ rows: IVAComprasRow[] }> {
    const dateFilter: any = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        companyId,
        status: { in: ["RECEIVED", "PARTIALLY_RECEIVED"] },
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      include: {
        supplier: { select: { name: true, taxId: true } },
      },
      orderBy: { date: "asc" },
    });

    const rows: IVAComprasRow[] = orders.map((o) => ({
      id: o.id,
      date: o.date,
      number: o.number,
      supplierName: o.supplier.name,
      supplierCuit: o.supplier.taxId ?? null,
      total: Number(o.total),
    }));

    return { rows };
  }

  // ── CSV export helpers ─────────────────────────────────────────────────────

  toCSVVentas(rows: IVAVentasRow[]): string {
    const allRates = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r.ivaByRate)))
    ).sort();

    const header = [
      "Fecha", "Tipo", "N°", "Cliente", "CUIT",
      "Neto Gravado", ...allRates.map((r) => `IVA ${r}%`),
      "Total IVA", "Total",
    ].join(",");

    const lines = rows.map((r) => [
      new Date(r.date).toLocaleDateString("es-AR"),
      r.type === "CREDIT_NOTE" ? "NC" : "FC",
      r.number,
      `"${r.customerName}"`,
      r.customerCuit ?? "",
      r.subtotal.toFixed(2),
      ...allRates.map((rate) => (r.ivaByRate[rate] ?? 0).toFixed(2)),
      r.taxTotal.toFixed(2),
      r.total.toFixed(2),
    ].join(","));

    return [header, ...lines].join("\n");
  }

  toCSVCompras(rows: IVAComprasRow[]): string {
    const header = ["Fecha", "N° OC", "Proveedor", "CUIT", "Total"].join(",");
    const lines = rows.map((r) => [
      new Date(r.date).toLocaleDateString("es-AR"),
      r.number,
      `"${r.supplierName}"`,
      r.supplierCuit ?? "",
      r.total.toFixed(2),
    ].join(","));
    return [header, ...lines].join("\n");
  }
}
