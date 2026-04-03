import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { TaxConfigService } from "../../../application/tax-configs/tax-config.service";

const router = Router();
const service = new TaxConfigService();

router.use(authMiddleware);

router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const configs = await service.list(companyId);
  res.json(configs);
});

router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { name, rate, isDefault } = req.body;
  if (!name?.trim() || rate == null) {
    return res.status(400).json({ message: "Nombre y tasa son requeridos" });
  }
  try {
    const config = await service.create(companyId, { name, rate: parseFloat(rate), isDefault: !!isDefault });
    res.status(201).json(config);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const config = await service.update(id, companyId, req.body);
    res.json(config);
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
    res.json({ message: "Configuración eliminada" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export const taxConfigsRouter = router;
