// ─── Mocks (hoisted: no references to outer vars) ─────────────────────────────

jest.mock("../config/database/prisma", () => ({
  prisma: {
    employee: { findFirst: jest.fn() },
    payroll: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { PayrollService } from "../application/payroll/payroll.service";

const mEmployee = prisma.employee as jest.Mocked<typeof prisma.employee>;
const mPayroll = prisma.payroll as jest.Mocked<typeof prisma.payroll>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeEmployee(grossSalary: number, overrides = {}) {
  return {
    id: 1,
    companyId: 10,
    fullName: "Carlos García",
    grossSalary,
    isActive: true,
    ...overrides,
  };
}

const BASE_INPUT = { employeeId: 1, companyId: 10, period: "2025-04" };

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("PayrollService – calculatePreview", () => {
  let service: PayrollService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PayrollService();
    mEmployee.findFirst.mockResolvedValue(makeEmployee(100000) as never);
  });

  // ── Errores ───────────────────────────────────────────────────────────────────

  it("throws when employee does not exist", async () => {
    mEmployee.findFirst.mockResolvedValue(null as never);
    await expect(service.calculatePreview(BASE_INPUT)).rejects.toThrow("Empleado no encontrado");
  });

  // ── Sueldo bruto ──────────────────────────────────────────────────────────────

  it("grossTotal = sueldo base cuando no hay extras", async () => {
    const result = await service.calculatePreview(BASE_INPUT);
    expect(result.grossTotal).toBe(100000);
    expect(result.basicSalary).toBe(100000);
  });

  it("grossTotal incluye horas extra, bonus y otrosIngresos", async () => {
    const result = await service.calculatePreview({
      ...BASE_INPUT,
      extraHours: 5000,
      bonus: 2000,
      otherEarnings: 1000,
    });
    expect(result.grossTotal).toBe(108000);
  });

  // ── Deducciones empleado ──────────────────────────────────────────────────────

  it("jubilación = 11% del bruto", async () => {
    const r = await service.calculatePreview(BASE_INPUT);
    expect(r.deductJubilacion).toBe(11000);
  });

  it("obra social = 3% del bruto", async () => {
    const r = await service.calculatePreview(BASE_INPUT);
    expect(r.deductObraSocial).toBe(3000);
  });

  it("INSSJP/PAMI = 3% del bruto", async () => {
    const r = await service.calculatePreview(BASE_INPUT);
    expect(r.deductInssjp).toBe(3000);
  });

  it("total deducciones = 17% sin sindicato (11+3+3)", async () => {
    const r = await service.calculatePreview(BASE_INPUT);
    expect(r.totalDeductions).toBe(17000);
  });

  it("sueldo neto = bruto − deducciones", async () => {
    const r = await service.calculatePreview(BASE_INPUT);
    expect(r.netSalary).toBe(83000);
  });

  it("sindicato se descuenta cuando se pasa sindicatoRate", async () => {
    const r = await service.calculatePreview({ ...BASE_INPUT, sindicatoRate: 0.02 });
    expect(r.deductSindicato).toBe(2000);
    expect(r.totalDeductions).toBe(19000);
    expect(r.netSalary).toBe(81000);
  });

  // ── Aportes patronales ────────────────────────────────────────────────────────

  it("patronal jubilación = 16%", async () => {
    const r = await service.calculatePreview(BASE_INPUT);
    expect(r.patronalJubilacion).toBe(16000);
  });

  it("patronal INSSJP = 2%", async () => {
    const r = await service.calculatePreview(BASE_INPUT);
    expect(r.patronalInssjp).toBe(2000);
  });

  it("patronal obra social = 6%", async () => {
    const r = await service.calculatePreview(BASE_INPUT);
    expect(r.patronalObraSocial).toBe(6000);
  });

  it("ART patronal se calcula cuando se pasa artRate", async () => {
    const r = await service.calculatePreview({ ...BASE_INPUT, artRate: 0.025 });
    expect(r.patronalArt).toBe(2500);
  });

  it("patronalTotal = jub + INSSJP + ObraSocial + ART", async () => {
    const r = await service.calculatePreview({ ...BASE_INPUT, artRate: 0.025 });
    expect(r.patronalTotal).toBe(16000 + 2000 + 6000 + 2500);
  });

  // ── Precisión decimal ─────────────────────────────────────────────────────────

  it("redondea a 2 decimales sin errores de punto flotante", async () => {
    mEmployee.findFirst.mockResolvedValue(makeEmployee(87350.75) as never);
    const r = await service.calculatePreview(BASE_INPUT);
    // jubilacion = 87350.75 * 0.11 = 9608.5825 → round2 = 9608.58
    expect(r.deductJubilacion).toBe(9608.58);
  });

  // ── SAC (aguinaldo) ───────────────────────────────────────────────────────────

  describe("periodType SAC", () => {
    it("calcula SAC = 50% del mejor sueldo del semestre", async () => {
      mPayroll.findMany.mockResolvedValue([
        { grossTotal: 100000 },
        { grossTotal: 120000 },
        { grossTotal: 110000 },
      ] as never);

      const r = await service.calculatePreview({
        ...BASE_INPUT,
        period: "2025-06",
        periodType: "SAC",
      });

      // SAC = 50% de 120000 = 60000 → se suma como bonus al bruto base
      expect(r.grossTotal).toBe(100000 + 60000);
    });

    it("SAC = 0 cuando no hay liquidaciones en el semestre", async () => {
      mPayroll.findMany.mockResolvedValue([] as never);

      const r = await service.calculatePreview({
        ...BASE_INPUT,
        period: "2025-06",
        periodType: "SAC",
      });

      // SAC = 0 → grossTotal = sueldo base
      expect(r.grossTotal).toBe(100000);
    });
  });
});
