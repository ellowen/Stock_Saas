import { prisma } from "../../config/database/prisma";
import { PayrollStatus, PayrollPeriodType } from "@prisma/client";

// ─── Porcentajes argentinos (configurables) ───────────────────────────────────
const RATES = {
  // Aportes empleado
  jubilacion: 0.11,
  obraSocial: 0.03,
  inssjp: 0.03,
  // Aportes patronales
  patronalJubilacion: 0.16,
  patronalInssjp: 0.02,
  patronalObraSocial: 0.06,
};

export interface CalculateInput {
  employeeId: number;
  companyId: number;
  period: string; // "2025-04"
  periodType?: PayrollPeriodType;
  extraHours?: number;
  bonus?: number;
  otherEarnings?: number;
  sindicatoRate?: number; // porcentaje adicional, ej: 0.02
  artRate?: number;       // porcentaje ART patronal, ej: 0.025
  notes?: string;
}

export interface PayrollCalculation {
  employeeId: number;
  period: string;
  periodType: PayrollPeriodType;
  basicSalary: number;
  extraHours: number;
  bonus: number;
  otherEarnings: number;
  grossTotal: number;
  deductJubilacion: number;
  deductObraSocial: number;
  deductInssjp: number;
  deductSindicato: number;
  deductOther: number;
  totalDeductions: number;
  netSalary: number;
  patronalJubilacion: number;
  patronalInssjp: number;
  patronalObraSocial: number;
  patronalArt: number;
  patronalTotal: number;
  notes?: string;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calculate(grossSalary: number, input: CalculateInput): PayrollCalculation {
  const extraHours = input.extraHours ?? 0;
  const bonus = input.bonus ?? 0;
  const otherEarnings = input.otherEarnings ?? 0;
  const sindicatoRate = input.sindicatoRate ?? 0;
  const artRate = input.artRate ?? 0;

  const grossTotal = round2(grossSalary + extraHours + bonus + otherEarnings);

  // Deducciones empleado
  const deductJubilacion = round2(grossTotal * RATES.jubilacion);
  const deductObraSocial = round2(grossTotal * RATES.obraSocial);
  const deductInssjp = round2(grossTotal * RATES.inssjp);
  const deductSindicato = round2(grossTotal * sindicatoRate);
  const deductOther = 0;
  const totalDeductions = round2(deductJubilacion + deductObraSocial + deductInssjp + deductSindicato + deductOther);
  const netSalary = round2(grossTotal - totalDeductions);

  // Aportes patronales
  const patronalJubilacion = round2(grossTotal * RATES.patronalJubilacion);
  const patronalInssjp = round2(grossTotal * RATES.patronalInssjp);
  const patronalObraSocial = round2(grossTotal * RATES.patronalObraSocial);
  const patronalArt = round2(grossTotal * artRate);
  const patronalTotal = round2(patronalJubilacion + patronalInssjp + patronalObraSocial + patronalArt);

  return {
    employeeId: input.employeeId,
    period: input.period,
    periodType: input.periodType ?? "MONTHLY",
    basicSalary: grossSalary,
    extraHours,
    bonus,
    otherEarnings,
    grossTotal,
    deductJubilacion,
    deductObraSocial,
    deductInssjp,
    deductSindicato,
    deductOther,
    totalDeductions,
    netSalary,
    patronalJubilacion,
    patronalInssjp,
    patronalObraSocial,
    patronalArt,
    patronalTotal,
    notes: input.notes,
  };
}

export class PayrollService {
  // Calcular SAC: 50% del mejor sueldo del semestre
  private async calculateSAC(employeeId: number, companyId: number, semester: string) {
    const [year, sem] = semester.split("-").map(Number);
    const fromMonth = sem === 1 ? 1 : 7;
    const toMonth = sem === 1 ? 6 : 12;
    const periods = Array.from({ length: toMonth - fromMonth + 1 }, (_, i) =>
      `${year}-${String(fromMonth + i).padStart(2, "0")}`
    );
    const payrolls = await prisma.payroll.findMany({
      where: { employeeId, companyId, period: { in: periods }, periodType: "MONTHLY" },
      select: { grossTotal: true },
    });
    const best = payrolls.length > 0
      ? Math.max(...payrolls.map((p) => Number(p.grossTotal)))
      : 0;
    return round2(best / 2);
  }

  async calculatePreview(input: CalculateInput): Promise<PayrollCalculation> {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId: input.companyId },
    });
    if (!employee) throw new Error("Empleado no encontrado");

    if (input.periodType === "SAC") {
      // Detectar semestre desde el period "2025-06" → sem 1, "2025-12" → sem 2
      const month = parseInt(input.period.split("-")[1]);
      const year = input.period.split("-")[0];
      const sem = month <= 6 ? "1" : "2";
      const sacAmount = await this.calculateSAC(input.employeeId, input.companyId, `${year}-${sem}`);
      const sacInput = { ...input, bonus: sacAmount };
      return calculate(Number(employee.grossSalary), sacInput);
    }

    return calculate(Number(employee.grossSalary), input);
  }

  async create(input: CalculateInput): Promise<ReturnType<typeof prisma.payroll.create>> {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId: input.companyId },
    });
    if (!employee) throw new Error("Empleado no encontrado");

    // Check no existe ya para ese período
    const existing = await prisma.payroll.findUnique({
      where: { employeeId_period: { employeeId: input.employeeId, period: input.period } },
    });
    if (existing) throw new Error(`Ya existe una liquidación para ${input.period}`);

    const calc = input.periodType === "SAC"
      ? await this.calculatePreview(input)
      : calculate(Number(employee.grossSalary), input);

    return prisma.payroll.create({
      data: {
        companyId: input.companyId,
        employeeId: input.employeeId,
        period: input.period,
        periodType: calc.periodType,
        basicSalary: calc.basicSalary,
        extraHours: calc.extraHours,
        bonus: calc.bonus,
        otherEarnings: calc.otherEarnings,
        grossTotal: calc.grossTotal,
        deductJubilacion: calc.deductJubilacion,
        deductObraSocial: calc.deductObraSocial,
        deductInssjp: calc.deductInssjp,
        deductSindicato: calc.deductSindicato,
        deductOther: calc.deductOther,
        totalDeductions: calc.totalDeductions,
        netSalary: calc.netSalary,
        patronalJubilacion: calc.patronalJubilacion,
        patronalInssjp: calc.patronalInssjp,
        patronalObraSocial: calc.patronalObraSocial,
        patronalArt: calc.patronalArt,
        patronalTotal: calc.patronalTotal,
        status: "DRAFT",
        notes: calc.notes,
      },
      include: { employee: { select: { firstName: true, lastName: true, cuil: true, position: true } } },
    });
  }

  async bulkCreate(companyId: number, period: string, artRate = 0, sindicatoRate = 0) {
    const employees = await prisma.employee.findMany({
      where: { companyId, status: "ACTIVE" },
    });

    const results: { employeeId: number; name: string; status: "created" | "skipped"; reason?: string }[] = [];

    for (const emp of employees) {
      const existing = await prisma.payroll.findUnique({
        where: { employeeId_period: { employeeId: emp.id, period } },
      });
      if (existing) {
        results.push({ employeeId: emp.id, name: `${emp.lastName} ${emp.firstName}`, status: "skipped", reason: "Ya existe" });
        continue;
      }
      const calc = calculate(Number(emp.grossSalary), {
        employeeId: emp.id,
        companyId,
        period,
        artRate,
        sindicatoRate,
      });
      await prisma.payroll.create({
        data: {
          companyId,
          employeeId: emp.id,
          period,
          periodType: "MONTHLY",
          basicSalary: calc.basicSalary,
          extraHours: calc.extraHours,
          bonus: calc.bonus,
          otherEarnings: calc.otherEarnings,
          grossTotal: calc.grossTotal,
          deductJubilacion: calc.deductJubilacion,
          deductObraSocial: calc.deductObraSocial,
          deductInssjp: calc.deductInssjp,
          deductSindicato: calc.deductSindicato,
          deductOther: calc.deductOther,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
          patronalJubilacion: calc.patronalJubilacion,
          patronalInssjp: calc.patronalInssjp,
          patronalObraSocial: calc.patronalObraSocial,
          patronalArt: calc.patronalArt,
          patronalTotal: calc.patronalTotal,
          status: "DRAFT",
        },
      });
      results.push({ employeeId: emp.id, name: `${emp.lastName} ${emp.firstName}`, status: "created" });
    }

    return results;
  }

  async list(companyId: number, filters: { period?: string; employeeId?: number; status?: PayrollStatus }) {
    return prisma.payroll.findMany({
      where: {
        companyId,
        ...(filters.period ? { period: filters.period } : {}),
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, cuil: true, position: true, cbu: true },
        },
      },
      orderBy: [{ period: "desc" }, { employee: { lastName: "asc" } }],
    });
  }

  async getById(id: number, companyId: number) {
    const p = await prisma.payroll.findFirst({
      where: { id, companyId },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, cuil: true,
            position: true, category: true, contractType: true,
            hireDate: true, cbu: true, bankAccount: true,
            branch: { select: { name: true } },
          },
        },
      },
    });
    if (!p) throw new Error("Liquidación no encontrada");
    return p;
  }

  async confirm(id: number, companyId: number) {
    const p = await prisma.payroll.findFirst({ where: { id, companyId } });
    if (!p) throw new Error("Liquidación no encontrada");
    if (p.status !== "DRAFT") throw new Error("Solo se puede confirmar un borrador");
    return prisma.payroll.update({ where: { id }, data: { status: "CONFIRMED" } });
  }

  async markPaid(id: number, companyId: number) {
    const p = await prisma.payroll.findFirst({ where: { id, companyId } });
    if (!p) throw new Error("Liquidación no encontrada");
    if (p.status === "PAID") throw new Error("Ya está marcada como pagada");
    return prisma.payroll.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  }

  async deleteDraft(id: number, companyId: number) {
    const p = await prisma.payroll.findFirst({ where: { id, companyId } });
    if (!p) throw new Error("Liquidación no encontrada");
    if (p.status !== "DRAFT") throw new Error("Solo se pueden eliminar borradores");
    return prisma.payroll.delete({ where: { id } });
  }

  // Períodos disponibles para el selector
  async listPeriods(companyId: number) {
    const rows = await prisma.payroll.groupBy({
      by: ["period"],
      where: { companyId },
      orderBy: { period: "desc" },
      take: 24,
    });
    return rows.map((r) => r.period);
  }

  // ─── Liquidación final ───────────────────────────────────────────────────

  async calculateFinal(input: CalculateInput & { terminationDate?: string; isDismissal?: boolean }) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId: input.companyId },
    });
    if (!employee) throw new Error("Empleado no encontrado");

    const hireDate = new Date(employee.hireDate);
    const termDate = input.terminationDate ? new Date(input.terminationDate) : new Date();

    // Días trabajados en el mes actual (sueldo proporcional)
    const daysInMonth = new Date(termDate.getFullYear(), termDate.getMonth() + 1, 0).getDate();
    const daysWorked = termDate.getDate();
    const proportionalSalary = round2((Number(employee.grossSalary) / daysInMonth) * daysWorked);

    // SAC proporcional del semestre actual
    const month = termDate.getMonth() + 1;
    const year = termDate.getFullYear();
    const semStart = month <= 6 ? 1 : 7;
    const monthsInSem = month - semStart + 1;
    const sacProportional = round2((Number(employee.grossSalary) / 12) * monthsInSem);

    // Vacaciones no gozadas (proporcional al año trabajado)
    const monthsWorkedThisYear = termDate.getMonth() - new Date(hireDate.getFullYear(), 0, 1).getMonth() + 1;
    const yearsWorked = Math.floor((termDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 3600 * 1000));
    const annualVacDays = yearsWorked < 5 ? 14 : yearsWorked < 10 ? 21 : yearsWorked < 20 ? 28 : 35;
    const vacNotTaken = round2((Number(employee.grossSalary) / 25) * Math.round((annualVacDays / 12) * monthsWorkedThisYear));

    // Indemnización (solo si es despido sin causa)
    const indemnizacion = input.isDismissal
      ? round2(Math.max(2, yearsWorked) * Number(employee.grossSalary))
      : 0;

    const totalOtherEarnings = round2(proportionalSalary + sacProportional + vacNotTaken + indemnizacion);

    const calc = calculate(0, {
      ...input,
      periodType: "FINAL",
      otherEarnings: totalOtherEarnings,
    });

    return {
      ...calc,
      breakdown: {
        proportionalSalary,
        sacProportional,
        vacNotTaken,
        indemnizacion,
        yearsWorked,
        daysWorked,
        daysInMonth,
      },
    };
  }

  // ─── Anticipos ───────────────────────────────────────────────────────────

  async listAdvances(companyId: number, employeeId?: number) {
    return prisma.payrollAdvance.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });
  }

  async createAdvance(companyId: number, data: { employeeId: number; amount: number; date?: string; notes?: string }) {
    const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId } });
    if (!employee) throw new Error("Empleado no encontrado");
    return prisma.payrollAdvance.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async markAdvanceDeducted(id: number, companyId: number, period: string) {
    const adv = await prisma.payrollAdvance.findFirst({ where: { id, companyId } });
    if (!adv) throw new Error("Anticipo no encontrado");
    return prisma.payrollAdvance.update({ where: { id }, data: { deductedIn: period } });
  }

  async deleteAdvance(id: number, companyId: number) {
    const adv = await prisma.payrollAdvance.findFirst({ where: { id, companyId } });
    if (!adv) throw new Error("Anticipo no encontrado");
    if (adv.deductedIn) throw new Error("No se puede eliminar un anticipo ya descontado");
    return prisma.payrollAdvance.delete({ where: { id } });
  }

  async pendingAdvancesForEmployee(companyId: number, employeeId: number) {
    return prisma.payrollAdvance.findMany({
      where: { companyId, employeeId, deductedIn: null },
      orderBy: { date: "asc" },
    });
  }
}
