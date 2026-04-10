import { prisma } from "../../config/database/prisma";
import { AccountType } from "@prisma/client";

// ─── Plan de cuentas base (FACPCE argentino) ─────────────────────────────────

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  subtype?: string;
  isParent?: boolean;
  parentCode?: string;
  isSystem?: boolean;
}

const BASE_PLAN: AccountSeed[] = [
  // ── 1. ACTIVO ──────────────────────────────────────────────────────────
  { code: "1", name: "ACTIVO", type: "ASSET", isParent: true, isSystem: true },
  { code: "1.1", name: "Activo Corriente", type: "ASSET", isParent: true, isSystem: true, parentCode: "1" },
  { code: "1.1.01", name: "Caja", type: "ASSET", subtype: "Disponibilidades", parentCode: "1.1" },
  { code: "1.1.02", name: "Banco Cuenta Corriente", type: "ASSET", subtype: "Disponibilidades", parentCode: "1.1" },
  { code: "1.1.03", name: "Banco Caja de Ahorro", type: "ASSET", subtype: "Disponibilidades", parentCode: "1.1" },
  { code: "1.1.04", name: "Mercaderías", type: "ASSET", subtype: "Bienes de cambio", parentCode: "1.1" },
  { code: "1.1.05", name: "IVA Crédito Fiscal", type: "ASSET", subtype: "Créditos fiscales", parentCode: "1.1" },
  { code: "1.1.06", name: "Deudores por Ventas", type: "ASSET", subtype: "Créditos por ventas", parentCode: "1.1" },
  { code: "1.1.07", name: "Anticipos a Proveedores", type: "ASSET", subtype: "Otros créditos", parentCode: "1.1" },
  { code: "1.2", name: "Activo No Corriente", type: "ASSET", isParent: true, isSystem: true, parentCode: "1" },
  { code: "1.2.01", name: "Inmuebles", type: "ASSET", subtype: "Bienes de uso", parentCode: "1.2" },
  { code: "1.2.02", name: "Rodados", type: "ASSET", subtype: "Bienes de uso", parentCode: "1.2" },
  { code: "1.2.03", name: "Muebles y Útiles", type: "ASSET", subtype: "Bienes de uso", parentCode: "1.2" },
  { code: "1.2.04", name: "Equipos de Computación", type: "ASSET", subtype: "Bienes de uso", parentCode: "1.2" },

  // ── 2. PASIVO ──────────────────────────────────────────────────────────
  { code: "2", name: "PASIVO", type: "LIABILITY", isParent: true, isSystem: true },
  { code: "2.1", name: "Pasivo Corriente", type: "LIABILITY", isParent: true, isSystem: true, parentCode: "2" },
  { code: "2.1.01", name: "Proveedores", type: "LIABILITY", subtype: "Deudas comerciales", parentCode: "2.1" },
  { code: "2.1.02", name: "IVA Débito Fiscal", type: "LIABILITY", subtype: "Deudas fiscales", parentCode: "2.1" },
  { code: "2.1.03", name: "Ingresos Brutos a Pagar", type: "LIABILITY", subtype: "Deudas fiscales", parentCode: "2.1" },
  { code: "2.1.04", name: "Sueldos a Pagar", type: "LIABILITY", subtype: "Deudas laborales", parentCode: "2.1" },
  { code: "2.1.05", name: "Cargas Sociales a Pagar", type: "LIABILITY", subtype: "Deudas laborales", parentCode: "2.1" },
  { code: "2.1.06", name: "Anticipos de Clientes", type: "LIABILITY", subtype: "Deudas comerciales", parentCode: "2.1" },
  { code: "2.1.07", name: "Préstamos Bancarios CP", type: "LIABILITY", subtype: "Deudas financieras", parentCode: "2.1" },
  { code: "2.2", name: "Pasivo No Corriente", type: "LIABILITY", isParent: true, isSystem: true, parentCode: "2" },
  { code: "2.2.01", name: "Préstamos Bancarios LP", type: "LIABILITY", subtype: "Deudas financieras", parentCode: "2.2" },

  // ── 3. PATRIMONIO NETO ────────────────────────────────────────────────
  { code: "3", name: "PATRIMONIO NETO", type: "EQUITY", isParent: true, isSystem: true },
  { code: "3.1.01", name: "Capital Social", type: "EQUITY", parentCode: "3" },
  { code: "3.1.02", name: "Resultados Acumulados", type: "EQUITY", parentCode: "3" },
  { code: "3.1.03", name: "Resultado del Ejercicio", type: "EQUITY", parentCode: "3" },

  // ── 4. INGRESOS ────────────────────────────────────────────────────────
  { code: "4", name: "INGRESOS", type: "REVENUE", isParent: true, isSystem: true },
  { code: "4.1.01", name: "Ventas", type: "REVENUE", parentCode: "4" },
  { code: "4.1.02", name: "Descuentos Obtenidos", type: "REVENUE", parentCode: "4" },
  { code: "4.1.03", name: "Otros Ingresos", type: "REVENUE", parentCode: "4" },

  // ── 5. EGRESOS ─────────────────────────────────────────────────────────
  { code: "5", name: "EGRESOS", type: "EXPENSE", isParent: true, isSystem: true },
  { code: "5.1.01", name: "Costo de Mercaderías Vendidas", type: "EXPENSE", subtype: "Costo de ventas", parentCode: "5" },
  { code: "5.1.02", name: "Sueldos y Jornales", type: "EXPENSE", subtype: "Gastos de personal", parentCode: "5" },
  { code: "5.1.03", name: "Cargas Sociales Patronales", type: "EXPENSE", subtype: "Gastos de personal", parentCode: "5" },
  { code: "5.1.04", name: "Alquiler", type: "EXPENSE", subtype: "Gastos operativos", parentCode: "5" },
  { code: "5.1.05", name: "Luz / Agua / Gas", type: "EXPENSE", subtype: "Gastos operativos", parentCode: "5" },
  { code: "5.1.06", name: "Internet / Teléfono", type: "EXPENSE", subtype: "Gastos operativos", parentCode: "5" },
  { code: "5.1.07", name: "Descuentos Concedidos", type: "EXPENSE", subtype: "Gastos comerciales", parentCode: "5" },
  { code: "5.1.08", name: "Gastos Bancarios", type: "EXPENSE", subtype: "Gastos financieros", parentCode: "5" },
  { code: "5.1.09", name: "Intereses Pagados", type: "EXPENSE", subtype: "Gastos financieros", parentCode: "5" },
  { code: "5.1.10", name: "Gastos Generales", type: "EXPENSE", subtype: "Gastos operativos", parentCode: "5" },
];

export class AccountService {
  // Sembrar el plan de cuentas base para una empresa nueva
  async seedForCompany(companyId: number) {
    const existing = await prisma.account.count({ where: { companyId } });
    if (existing > 0) return; // ya tiene cuentas

    // Primero crear las cuentas padre (sin parentId)
    const created = new Map<string, number>(); // code → id

    for (const acc of BASE_PLAN) {
      if (!acc.parentCode) {
        const created_ = await prisma.account.create({
          data: { companyId, code: acc.code, name: acc.name, type: acc.type, subtype: acc.subtype ?? null, isParent: acc.isParent ?? false, isSystem: acc.isSystem ?? false },
        });
        created.set(acc.code, created_.id);
      }
    }

    // Luego las hijas (dos pasadas para cubrir 3 niveles de jerarquía)
    for (let pass = 0; pass < 2; pass++) {
      for (const acc of BASE_PLAN) {
        if (acc.parentCode && !created.has(acc.code)) {
          const parentId = created.get(acc.parentCode);
          if (parentId !== undefined) {
            const created_ = await prisma.account.create({
              data: { companyId, code: acc.code, name: acc.name, type: acc.type, subtype: acc.subtype ?? null, isParent: acc.isParent ?? false, parentId, isSystem: acc.isSystem ?? false },
            });
            created.set(acc.code, created_.id);
          }
        }
      }
    }
  }

  async list(companyId: number, includeInactive = false) {
    return prisma.account.findMany({
      where: { companyId, ...(includeInactive ? {} : { active: true }) },
      orderBy: { code: "asc" },
    });
  }

  // Árbol jerárquico
  async tree(companyId: number) {
    const all = await prisma.account.findMany({
      where: { companyId, active: true },
      orderBy: { code: "asc" },
    });

    type AccountNode = typeof all[0] & { children: AccountNode[] };
    const map = new Map<number, AccountNode>();
    all.forEach((a) => map.set(a.id, { ...a, children: [] }));

    const roots: AccountNode[] = [];
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else if (!node.parentId) {
        roots.push(node);
      }
    });
    return roots;
  }

  async create(companyId: number, data: { code: string; name: string; type: AccountType; subtype?: string; parentId?: number }) {
    const exists = await prisma.account.findUnique({ where: { companyId_code: { companyId, code: data.code } } });
    if (exists) throw new Error(`Ya existe una cuenta con el código ${data.code}`);
    return prisma.account.create({ data: { companyId, ...data } });
  }

  async update(id: number, companyId: number, data: { name?: string; subtype?: string; active?: boolean }) {
    const acc = await prisma.account.findFirst({ where: { id, companyId } });
    if (!acc) throw new Error("Cuenta no encontrada");
    if (acc.isSystem && data.active === false) throw new Error("No se puede desactivar una cuenta del sistema");
    return prisma.account.update({ where: { id }, data });
  }

  async getById(id: number, companyId: number) {
    const acc = await prisma.account.findFirst({ where: { id, companyId } });
    if (!acc) throw new Error("Cuenta no encontrada");
    return acc;
  }

  // Balance de sumas y saldos para una cuenta en un período
  async getBalance(accountId: number, companyId: number, from?: Date, to?: Date) {
    const where: any = { accountId, journalEntry: { companyId, status: "POSTED" } };
    if (from || to) {
      where.journalEntry.date = {};
      if (from) where.journalEntry.date.gte = from;
      if (to) where.journalEntry.date.lte = to;
    }
    const lines = await prisma.journalLine.findMany({
      where,
      select: { debit: true, credit: true },
    });
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);
    return { totalDebit, totalCredit, balance: totalDebit - totalCredit };
  }
}
