import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { JournalService } from "../../../application/accounting/journal.service";

const router = Router();
const service = new JournalService();

router.use(authMiddleware);
router.use(requirePermission("ACCOUNTING_VIEW"));

// GET /journal?from=&to=&status=&sourceType=
router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { from, to, status, sourceType } = req.query as Record<string, string>;
  const entries = await service.list(companyId, {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    status: status as any || undefined,
    sourceType: sourceType as any || undefined,
  });
  res.json(entries);
});

// GET /journal/:id
router.get("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const entry = await service.getById(id, companyId);
    res.json(entry);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
});

// POST /journal — crear asiento (DRAFT)
router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const { date, description, reference, sourceType, lines } = req.body;
  if (!date || !description || !lines?.length) {
    return res.status(400).json({ message: "date, description y lines son requeridos" });
  }
  try {
    const entry = await service.create({
      companyId,
      createdBy: userId,
      date: new Date(date),
      description,
      reference,
      sourceType,
      lines,
    });
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /journal/:id/post — confirmar (DRAFT → POSTED)
router.post("/:id/post", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const entry = await service.post(id, companyId);
    res.json(entry);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /journal/:id/void — anular (crea contra-asiento)
router.post("/:id/void", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const reversal = await service.void(id, companyId, userId);
    res.json(reversal);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /journal/:id — solo borradores
router.delete("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.deleteDraft(id, companyId);
    res.json({ message: "Asiento eliminado" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export const journalRouter = router;
