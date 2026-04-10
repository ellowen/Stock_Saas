import { prisma } from "../../config/database/prisma";
import { JournalSource, JournalStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

interface JournalLineInput {
  accountId: number;
  debit: number;
  credit: number;
  description?: string;
}

interface CreateJournalInput {
  companyId: number;
  createdBy: number;
  date: Date;
  description: string;
  reference?: string;
  sourceType?: JournalSource;
  sourceId?: number;
  isAutomatic?: boolean;
  lines: JournalLineInput[];
}

function validate(lines: JournalLineInput[]) {
  if (lines.length < 2) throw new Error("Un asiento requiere al menos 2 líneas");

  const sumDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const sumCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);

  if (Math.abs(sumDebit - sumCredit) > 0.001)
    throw new Error(`El asiento no balancea: débitos ${sumDebit.toFixed(2)} ≠ créditos ${sumCredit.toFixed(2)}`);

  if (sumDebit === 0) throw new Error("El asiento no puede tener importe cero");

  for (const l of lines) {
    if (l.debit < 0 || l.credit < 0) throw new Error("Los importes no pueden ser negativos");
    if (l.debit > 0 && l.credit > 0) throw new Error("Una línea no puede tener débito y crédito simultáneamente");
  }
}

export class JournalService {
  async list(
    companyId: number,
    filters: { from?: Date; to?: Date; status?: JournalStatus; sourceType?: JournalSource } = {}
  ) {
    const where: any = { companyId };
    if (filters.status) where.status = filters.status;
    if (filters.sourceType) where.sourceType = filters.sourceType;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = filters.from;
      if (filters.to) where.date.lte = filters.to;
    }

    return prisma.journalEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      include: {
        user: { select: { fullName: true } },
        lines: {
          include: { account: { select: { code: true, name: true } } },
          orderBy: { debit: "desc" },
        },
      },
    });
  }

  async getById(id: number, companyId: number) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: {
        user: { select: { fullName: true } },
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
          orderBy: { debit: "desc" },
        },
      },
    });
    if (!entry) throw new Error("Asiento no encontrado");
    return entry;
  }

  async create(input: CreateJournalInput) {
    validate(input.lines);

    // Verify all accounts belong to the company
    const accountIds = input.lines.map((l) => l.accountId);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds }, companyId: input.companyId, active: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new Error("Una o más cuentas no existen o están inactivas");
    }
    // Accounts must be leaf (non-parent)
    const parents = accounts.filter((a) => a.isParent);
    if (parents.length > 0) {
      throw new Error(`No se puede imputar a cuentas padre: ${parents.map((a) => a.code).join(", ")}`);
    }

    return prisma.journalEntry.create({
      data: {
        companyId: input.companyId,
        createdBy: input.createdBy,
        date: input.date,
        description: input.description,
        reference: input.reference,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        isAutomatic: input.isAutomatic ?? false,
        status: "DRAFT",
        lines: {
          create: input.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
      include: {
        lines: { include: { account: { select: { code: true, name: true } } } },
      },
    });
  }

  async post(id: number, companyId: number) {
    const entry = await prisma.journalEntry.findFirst({ where: { id, companyId } });
    if (!entry) throw new Error("Asiento no encontrado");
    if (entry.status !== "DRAFT") throw new Error("Solo se pueden confirmar asientos en borrador");
    return prisma.journalEntry.update({ where: { id }, data: { status: "POSTED" } });
  }

  // Creates a reversal entry (contra-asiento) for a POSTED entry
  async void(id: number, companyId: number, createdBy: number) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    if (!entry) throw new Error("Asiento no encontrado");
    if (entry.status !== "POSTED") throw new Error("Solo se pueden anular asientos confirmados");
    if (entry.isAutomatic) throw new Error("Los asientos automáticos no se pueden anular manualmente");

    // Create reversal: swap debit ↔ credit
    const reversal = await prisma.journalEntry.create({
      data: {
        companyId,
        createdBy,
        date: new Date(),
        description: `ANULACIÓN: ${entry.description}`,
        reference: entry.reference ? `VOID-${entry.reference}` : undefined,
        sourceType: entry.sourceType ?? undefined,
        sourceId: entry.sourceId ?? undefined,
        isAutomatic: false,
        status: "POSTED",
        lines: {
          create: entry.lines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.credit),
            credit: Number(l.debit),
            description: l.description ?? undefined,
          })),
        },
      },
      include: {
        lines: { include: { account: { select: { code: true, name: true } } } },
      },
    });

    return reversal;
  }

  async deleteDraft(id: number, companyId: number) {
    const entry = await prisma.journalEntry.findFirst({ where: { id, companyId } });
    if (!entry) throw new Error("Asiento no encontrado");
    if (entry.status !== "DRAFT") throw new Error("Solo se pueden eliminar asientos en borrador");
    await prisma.journalEntry.delete({ where: { id } });
  }

  // ── Totals helper ──────────────────────────────────────────────────────────
  async totals(id: number, companyId: number) {
    const entry = await this.getById(id, companyId);
    const sumDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
    const sumCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);
    return { sumDebit, sumCredit, balanced: Math.abs(sumDebit - sumCredit) < 0.001 };
  }
}
