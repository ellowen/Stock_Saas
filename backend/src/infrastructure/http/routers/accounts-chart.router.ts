import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { AccountService } from "../../../application/accounting/account.service";

const router = Router();
const service = new AccountService();

router.use(authMiddleware);

// GET /accounts-chart — lista plana
router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const includeInactive = req.query["includeInactive"] === "true";
  const accounts = await service.list(companyId, includeInactive);
  res.json(accounts);
});

// GET /accounts-chart/tree — árbol jerárquico
router.get("/tree", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const tree = await service.tree(companyId);
  res.json(tree);
});

// POST /accounts-chart/seed — sembrar plan base (idempotente)
router.post("/seed", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  await service.seedForCompany(companyId);
  res.json({ message: "Plan de cuentas base sembrado correctamente" });
});

// GET /accounts-chart/:id
router.get("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const acc = await service.getById(id, companyId);
    res.json(acc);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
});

// POST /accounts-chart
router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { code, name, type, subtype, parentId } = req.body;
  if (!code || !name || !type) return res.status(400).json({ message: "code, name y type son requeridos" });
  try {
    const acc = await service.create(companyId, { code, name, type, subtype, parentId: parentId ? Number(parentId) : undefined });
    res.status(201).json(acc);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /accounts-chart/:id
router.put("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  const { name, subtype, active } = req.body;
  try {
    const acc = await service.update(id, companyId, { name, subtype, active });
    res.json(acc);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /accounts-chart/:id/balance?from=&to=
router.get("/:id/balance", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  const from = req.query["from"] ? new Date(req.query["from"] as string) : undefined;
  const to = req.query["to"] ? new Date(req.query["to"] as string) : undefined;
  try {
    const balance = await service.getBalance(id, companyId, from, to);
    res.json(balance);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
});

export const accountsChartRouter = router;
