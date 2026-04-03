import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { SupplierService } from "../../../application/suppliers/supplier.service";

const router = Router();
const service = new SupplierService();

router.use(authMiddleware);

router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const search = req.query["search"] as string | undefined;
  const suppliers = await service.list(companyId, search);
  res.json(suppliers);
});

router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { name, taxId, address, city, email, phone, notes } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "El nombre es requerido" });
  }
  try {
    const supplier = await service.create(companyId, { name, taxId, address, city, email, phone, notes });
    res.status(201).json(supplier);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const supplier = await service.update(id, companyId, req.body);
    res.json(supplier);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.delete(id, companyId);
    res.json({ message: "Proveedor desactivado" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export const suppliersRouter = router;
