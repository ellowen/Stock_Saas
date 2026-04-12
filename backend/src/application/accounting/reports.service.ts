import { prisma } from "../../config/database/prisma";

export class AccountingReportsService {
  // ── Balance de Sumas y Saldos ─────────────────────────────────────────────
  async trialBalance(companyId: number, from?: Date, to?: Date) {
    const accounts = await prisma.account.findMany({
      where: { companyId, isParent: false, active: true },
      orderBy: { code: "asc" },
      include: { parent: { select: { code: true, name: true } } },
    });

    const dateFilter: any = { companyId, status: "POSTED" };
    if (from || to) {
      dateFilter.date = {};
      if (from) dateFilter.date.gte = from;
      if (to) dateFilter.date.lte = to;
    }

    const lines = await prisma.journalLine.findMany({
      where: { journalEntry: dateFilter },
      select: { accountId: true, debit: true, credit: true },
    });

    const totals = new Map<number, { debit: number; credit: number }>();
    for (const l of lines) {
      const cur = totals.get(l.accountId) ?? { debit: 0, credit: 0 };
      cur.debit += Number(l.debit);
      cur.credit += Number(l.credit);
      totals.set(l.accountId, cur);
    }

    const rows = accounts.map((acc) => {
      const t = totals.get(acc.id) ?? { debit: 0, credit: 0 };
      const saldoDeudor = t.debit > t.credit ? t.debit - t.credit : 0;
      const saldoAcreedor = t.credit > t.debit ? t.credit - t.debit : 0;
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        sumDebit: t.debit,
        sumCredit: t.credit,
        saldoDeudor,
        saldoAcreedor,
      };
    });

    const totRow = rows.reduce(
      (acc, r) => ({
        sumDebit: acc.sumDebit + r.sumDebit,
        sumCredit: acc.sumCredit + r.sumCredit,
        saldoDeudor: acc.saldoDeudor + r.saldoDeudor,
        saldoAcreedor: acc.saldoAcreedor + r.saldoAcreedor,
      }),
      { sumDebit: 0, sumCredit: 0, saldoDeudor: 0, saldoAcreedor: 0 }
    );

    return { rows, totals: totRow };
  }

  toCSVTrialBalance(rows: Awaited<ReturnType<AccountingReportsService["trialBalance"]>>["rows"]) {
    const header = "Codigo,Cuenta,Tipo,Debe,Haber,Saldo Deudor,Saldo Acreedor";
    const body = rows.map((r) =>
      [r.code, r.name, r.type, r.sumDebit.toFixed(2), r.sumCredit.toFixed(2), r.saldoDeudor.toFixed(2), r.saldoAcreedor.toFixed(2)].join(",")
    );
    return [header, ...body].join("\n");
  }

  // ── Libro Mayor ───────────────────────────────────────────────────────────
  async ledger(companyId: number, accountId: number, from?: Date, to?: Date) {
    const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
    if (!account) throw new Error("Cuenta no encontrada");

    const dateFilter: any = { companyId, status: "POSTED" };
    if (from || to) {
      dateFilter.date = {};
      if (from) dateFilter.date.gte = from;
      if (to) dateFilter.date.lte = to;
    }

    const lines = await prisma.journalLine.findMany({
      where: { accountId, journalEntry: dateFilter },
      orderBy: [{ journalEntry: { date: "asc" } }, { journalEntry: { id: "asc" } }],
      include: {
        journalEntry: {
          select: { id: true, date: true, description: true, reference: true },
        },
      },
    });

    let runningBalance = 0;
    const rows = lines.map((l) => {
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      runningBalance += debit - credit;
      return {
        journalEntryId: l.journalEntry.id,
        date: l.journalEntry.date,
        description: l.journalEntry.description,
        reference: l.journalEntry.reference,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return {
      account: { id: account.id, code: account.code, name: account.name, type: account.type },
      rows,
      totalDebit,
      totalCredit,
      finalBalance: runningBalance,
    };
  }

  toCSVLedger(data: Awaited<ReturnType<AccountingReportsService["ledger"]>>) {
    const header = "Fecha,Asiento,Descripcion,Referencia,Debe,Haber,Saldo";
    const body = data.rows.map((r) =>
      [
        new Date(r.date).toLocaleDateString("es-AR"),
        r.journalEntryId,
        `"${r.description}"`,
        r.reference ?? "",
        r.debit.toFixed(2),
        r.credit.toFixed(2),
        r.balance.toFixed(2),
      ].join(",")
    );
    return [header, ...body].join("\n");
  }

  // ── Estado de Resultados ──────────────────────────────────────────────────
  async incomeStatement(companyId: number, from?: Date, to?: Date) {
    const accounts = await prisma.account.findMany({
      where: { companyId, type: { in: ["REVENUE", "EXPENSE"] }, isParent: false, active: true },
      orderBy: { code: "asc" },
    });

    const dateFilter: any = { companyId, status: "POSTED" };
    if (from || to) {
      dateFilter.date = {};
      if (from) dateFilter.date.gte = from;
      if (to) dateFilter.date.lte = to;
    }

    const lines = await prisma.journalLine.findMany({
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        journalEntry: dateFilter,
      },
      select: { accountId: true, debit: true, credit: true },
    });

    const totals = new Map<number, number>(); // accountId → net (credit - debit for REVENUE; debit - credit for EXPENSE)
    for (const l of lines) {
      const cur = totals.get(l.accountId) ?? 0;
      totals.set(l.accountId, cur + Number(l.credit) - Number(l.debit));
    }

    const revenue: { id: number; code: string; name: string; amount: number }[] = [];
    const expense: { id: number; code: string; name: string; amount: number }[] = [];

    for (const acc of accounts) {
      const net = totals.get(acc.id) ?? 0;
      if (acc.type === "REVENUE") {
        revenue.push({ id: acc.id, code: acc.code, name: acc.name, amount: net });
      } else {
        expense.push({ id: acc.id, code: acc.code, name: acc.name, amount: -net }); // positive = cost
      }
    }

    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expense.reduce((s, r) => s + r.amount, 0);
    const result = totalRevenue - totalExpense;

    return { revenue, expense, totalRevenue, totalExpense, result };
  }

  toCSVIncomeStatement(data: Awaited<ReturnType<AccountingReportsService["incomeStatement"]>>) {
    const lines: string[] = ["Tipo,Codigo,Cuenta,Importe"];
    for (const r of data.revenue) lines.push(`INGRESO,${r.code},"${r.name}",${r.amount.toFixed(2)}`);
    for (const e of data.expense) lines.push(`EGRESO,${e.code},"${e.name}",${e.amount.toFixed(2)}`);
    lines.push(`,,Total Ingresos,${data.totalRevenue.toFixed(2)}`);
    lines.push(`,,Total Egresos,${data.totalExpense.toFixed(2)}`);
    lines.push(`,,Resultado del período,${data.result.toFixed(2)}`);
    return lines.join("\n");
  }
}
