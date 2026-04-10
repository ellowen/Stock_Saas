import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { EmployeeService } from "../../../application/employees/employee.service";

const router = Router();
const service = new EmployeeService();

router.use(authMiddleware);

router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const includeInactive = req.query["includeInactive"] === "true";
  const employees = await service.list(companyId, includeInactive);
  res.json(employees);
});

router.get("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const employee = await service.getById(id, companyId);
    res.json(employee);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const {
    branchId, firstName, lastName, cuil, email, phone, address,
    position, category, hireDate, contractType, grossSalary,
    bankAccount, cbu, notes,
  } = req.body;

  if (!firstName?.trim()) return res.status(400).json({ message: "El nombre es requerido" });
  if (!lastName?.trim()) return res.status(400).json({ message: "El apellido es requerido" });
  if (!hireDate) return res.status(400).json({ message: "La fecha de ingreso es requerida" });
  if (!grossSalary || isNaN(Number(grossSalary))) return res.status(400).json({ message: "El sueldo bruto es requerido" });

  try {
    const employee = await service.create(companyId, {
      branchId: branchId ? Number(branchId) : undefined,
      firstName, lastName, cuil, email, phone, address,
      position, category,
      hireDate: new Date(hireDate),
      contractType,
      grossSalary: Number(grossSalary),
      bankAccount, cbu, notes,
    });
    res.status(201).json(employee);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const data = { ...req.body };
    if (data.grossSalary) data.grossSalary = Number(data.grossSalary);
    if (data.branchId) data.branchId = Number(data.branchId);
    if (data.hireDate) data.hireDate = new Date(data.hireDate);
    if (data.terminationDate) data.terminationDate = new Date(data.terminationDate);
    const employee = await service.update(id, companyId, data);
    res.json(employee);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  const terminationDate = req.body.terminationDate ? new Date(req.body.terminationDate) : undefined;
  try {
    await service.deactivate(id, companyId, terminationDate);
    res.json({ message: "Empleado dado de baja" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export const employeesRouter = router;
