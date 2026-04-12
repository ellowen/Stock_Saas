import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { PayrollService } from "../../../application/payroll/payroll.service";
import { autoJournal } from "../../../application/accounting/auto-journal.service";

const router = Router();
const service = new PayrollService();

router.use(authMiddleware);
router.use(requirePermission("EMPLOYEES_VIEW"));

// GET /payrolls?period=&employeeId=&status=
router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { period, employeeId, status } = req.query as Record<string, string>;
  const payrolls = await service.list(companyId, {
    period: period || undefined,
    employeeId: employeeId ? Number(employeeId) : undefined,
    status: status as any || undefined,
  });
  res.json(payrolls);
});

// GET /payrolls/periods
router.get("/periods", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const periods = await service.listPeriods(companyId);
  res.json(periods);
});

// GET /payrolls/:id
router.get("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const p = await service.getById(id, companyId);
    res.json(p);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
});

// POST /payrolls/preview — calcula sin guardar
router.post("/preview", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { employeeId, period, periodType, extraHours, bonus, otherEarnings, sindicatoRate, artRate, notes } = req.body;
  if (!employeeId || !period) return res.status(400).json({ message: "employeeId y period son requeridos" });
  try {
    const calc = await service.calculatePreview({
      companyId, employeeId: Number(employeeId), period, periodType,
      extraHours: extraHours ? Number(extraHours) : undefined,
      bonus: bonus ? Number(bonus) : undefined,
      otherEarnings: otherEarnings ? Number(otherEarnings) : undefined,
      sindicatoRate: sindicatoRate ? Number(sindicatoRate) : undefined,
      artRate: artRate ? Number(artRate) : undefined,
      notes,
    });
    res.json(calc);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /payrolls — crear liquidación (guarda como DRAFT)
router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { employeeId, period, periodType, extraHours, bonus, otherEarnings, sindicatoRate, artRate, notes } = req.body;
  if (!employeeId || !period) return res.status(400).json({ message: "employeeId y period son requeridos" });
  try {
    const payroll = await service.create({
      companyId, employeeId: Number(employeeId), period, periodType,
      extraHours: extraHours ? Number(extraHours) : undefined,
      bonus: bonus ? Number(bonus) : undefined,
      otherEarnings: otherEarnings ? Number(otherEarnings) : undefined,
      sindicatoRate: sindicatoRate ? Number(sindicatoRate) : undefined,
      artRate: artRate ? Number(artRate) : undefined,
      notes,
    });
    res.status(201).json(payroll);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /payrolls/bulk — calcular todos los empleados activos para un período
router.post("/bulk", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { period, artRate, sindicatoRate } = req.body;
  if (!period) return res.status(400).json({ message: "period es requerido" });
  try {
    const results = await service.bulkCreate(
      companyId,
      period,
      artRate ? Number(artRate) : 0,
      sindicatoRate ? Number(sindicatoRate) : 0
    );
    res.json(results);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /payrolls/:id/confirm
router.post("/:id/confirm", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const p = await service.confirm(id, companyId);
    res.json(p);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /payrolls/:id/pay
router.post("/:id/pay", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const p = await service.markPaid(id, companyId);
    // Fire-and-forget auto journal for paid payroll
    const { prisma } = await import("../../../config/database/prisma");
    prisma.employee.findUnique({ where: { id: p.employeeId }, select: { firstName: true, lastName: true } })
      .then((emp) => autoJournal.onPayrollPaid({
        companyId,
        createdBy: userId,
        payrollId: id,
        grossTotal: Number(p.grossTotal),
        netSalary: Number(p.netSalary),
        totalDeductions: Number(p.totalDeductions),
        patronalTotal: Number(p.patronalTotal),
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : `#${p.employeeId}`,
        period: p.period,
      }))
      .catch(console.error);
    res.json(p);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /payrolls/:id — solo borradores
router.delete("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.deleteDraft(id, companyId);
    res.json({ message: "Liquidación eliminada" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /payrolls/final-preview — calcula liquidación final sin guardar
router.post("/final-preview", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { employeeId, period, terminationDate, isDismissal, sindicatoRate, artRate } = req.body;
  if (!employeeId || !period) return res.status(400).json({ message: "employeeId y period son requeridos" });
  try {
    const result = await service.calculateFinal({
      companyId,
      employeeId: Number(employeeId),
      period,
      terminationDate,
      isDismissal: Boolean(isDismissal),
      sindicatoRate: sindicatoRate ? Number(sindicatoRate) / 100 : undefined,
      artRate: artRate ? Number(artRate) / 100 : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ── Anticipos ──────────────────────────────────────────────────────────────

// GET /payrolls/advances?employeeId=
router.get("/advances", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const employeeId = req.query["employeeId"] ? Number(req.query["employeeId"]) : undefined;
  const advances = await service.listAdvances(companyId, employeeId);
  res.json(advances);
});

// POST /payrolls/advances
router.post("/advances", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { employeeId, amount, date, notes } = req.body;
  if (!employeeId || !amount) return res.status(400).json({ message: "employeeId y amount son requeridos" });
  try {
    const adv = await service.createAdvance(companyId, {
      employeeId: Number(employeeId),
      amount: Number(amount),
      date,
      notes,
    });
    res.status(201).json(adv);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /payrolls/advances/:id/deduct
router.patch("/advances/:id/deduct", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  const { period } = req.body;
  if (!period) return res.status(400).json({ message: "period es requerido" });
  try {
    const adv = await service.markAdvanceDeducted(id, companyId, period);
    res.json(adv);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /payrolls/advances/:id
router.delete("/advances/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.deleteAdvance(id, companyId);
    res.json({ message: "Anticipo eliminado" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /payrolls/advances/pending/:employeeId
router.get("/advances/pending/:employeeId", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const employeeId = parseInt(req.params["employeeId"] as string);
  if (isNaN(employeeId)) return res.status(400).json({ message: "ID inválido" });
  const advances = await service.pendingAdvancesForEmployee(companyId, employeeId);
  res.json(advances);
});

export const payrollsRouter = router;
