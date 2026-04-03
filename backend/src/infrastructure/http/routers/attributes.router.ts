import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { AttributeService } from "../../../application/attributes/attribute.service";
import { INDUSTRY_PROFILES } from "../../../application/attributes/industry-profiles";

const router = Router();
const service = new AttributeService();

router.use(authMiddleware);

// GET /attributes/profiles — perfiles de industria disponibles
router.get("/profiles", (_req: Request, res: Response) => {
  res.json(service.getProfiles());
});

// GET /attributes — lista de atributos de la empresa
router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const attrs = await service.list(companyId);
  // Parsear options de JSON string a array
  const result = attrs.map((a) => ({
    ...a,
    options: a.options ? JSON.parse(a.options) : [],
  }));
  res.json(result);
});

// POST /attributes — crear atributo
router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { name, type, options, sortOrder } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "El nombre es requerido" });
  }
  if (!["TEXT", "NUMBER", "SELECT"].includes(type)) {
    return res.status(400).json({ message: "Tipo inválido" });
  }
  try {
    const attr = await service.create(companyId, { name, type, options, sortOrder });
    res.status(201).json({ ...attr, options: attr.options ? JSON.parse(attr.options) : [] });
  } catch (err: any) {
    res.status(409).json({ message: err.message });
  }
});

// PUT /attributes/:id — actualizar atributo
router.put("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const attr = await service.update(id, companyId, req.body);
    if (!attr) return res.status(404).json({ message: "Atributo no encontrado" });
    res.json({ ...attr, options: attr.options ? JSON.parse(attr.options) : [] });
  } catch (err: any) {
    res.status(409).json({ message: err.message });
  }
});

// DELETE /attributes/:id — eliminar atributo
router.delete("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const deleted = await service.delete(id, companyId);
    if (!deleted) return res.status(404).json({ message: "Atributo no encontrado" });
    res.json({ message: "Atributo eliminado" });
  } catch (err: any) {
    res.status(409).json({ message: err.message });
  }
});

// POST /attributes/apply-profile — aplicar perfil de industria
router.post("/apply-profile", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { profileKey } = req.body;
  if (!profileKey) return res.status(400).json({ message: "profileKey es requerido" });
  try {
    const result = await service.applyIndustryProfile(companyId, profileKey);
    res.json({ ...result, message: `Perfil aplicado: ${result.created} atributos creados, ${result.skipped} ya existían` });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export const attributesRouter = router;
