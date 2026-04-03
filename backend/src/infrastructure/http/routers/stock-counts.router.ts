import { Router } from "express";
import { Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { StockCountService } from "../../../application/stock-counts/stock-count.service";

const router = Router();
router.use(authMiddleware);

const service = new StockCountService();

// POST /stock-counts — create new session
router.post("/", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const schema = z.object({
    branchId: z.number().int().positive(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() });
  try {
    const result = await service.create(req.auth.companyId, parsed.data.branchId, req.auth.userId, parsed.data.notes);
    return res.status(201).json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

// GET /stock-counts
router.get("/", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  try {
    const list = await service.list(req.auth.companyId, branchId);
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

// GET /stock-counts/:id
router.get("/:id", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await service.getById(req.auth.companyId, Number(req.params.id));
    return res.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return res.status(404).json({ message: "Not found" });
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

// PATCH /stock-counts/:id/items — batch update countedQty
router.patch("/:id/items", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const schema = z.object({
    updates: z.array(z.object({
      itemId: z.number().int().positive(),
      countedQty: z.number().int().min(0).nullable(),
    })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() });
  try {
    const result = await service.updateItems(req.auth.companyId, Number(req.params.id), parsed.data.updates);
    return res.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return res.status(404).json({ message: "Not found" });
    if (e instanceof Error && e.message === "NOT_OPEN") return res.status(409).json({ message: "Session is not open" });
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

// POST /stock-counts/:id/apply
router.post("/:id/apply", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  try {
    const result = await service.apply(req.auth.companyId, Number(req.params.id), req.auth.userId);
    return res.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return res.status(404).json({ message: "Not found" });
    if (e instanceof Error && e.message === "NOT_OPEN") return res.status(409).json({ message: "Session is not open" });
    if (e instanceof Error && e.message === "NO_ITEMS") return res.status(400).json({ message: "No items counted yet" });
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

// DELETE /stock-counts/:id — cancel
router.delete("/:id", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  try {
    await service.cancel(req.auth.companyId, Number(req.params.id));
    return res.json({ message: "Cancelled" });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return res.status(404).json({ message: "Not found" });
    if (e instanceof Error && e.message === "NOT_OPEN") return res.status(409).json({ message: "Session is not open" });
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

export const stockCountsRouter = router;
