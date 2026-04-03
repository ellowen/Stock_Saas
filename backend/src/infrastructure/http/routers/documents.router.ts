import { Router, Request, Response } from "express";
import { DocumentType, DocumentStatus } from "@prisma/client";
import { authMiddleware } from "../middleware/auth";
import { DocumentService } from "../../../application/documents/document.service";

const router = Router();
const service = new DocumentService();

router.use(authMiddleware);

router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { type, status, customerId, from, to } = req.query as Record<string, string>;
  try {
    const docs = await service.list(companyId, {
      type: type as DocumentType | undefined,
      status: status as DocumentStatus | undefined,
      customerId: customerId ? parseInt(customerId) : undefined,
      from,
      to,
    });
    res.json(docs);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  const doc = await service.getById(id, companyId);
  if (!doc) return res.status(404).json({ message: "Documento no encontrado" });
  res.json(doc);
});

router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const { type, customerId, branchId, dueDate, notes, items } = req.body;
  if (!type || !branchId || !items?.length) {
    return res.status(400).json({ message: "type, branchId e items son requeridos" });
  }
  try {
    const doc = await service.create(companyId, userId, {
      type,
      customerId: customerId ? parseInt(customerId) : undefined,
      branchId: parseInt(branchId),
      dueDate,
      notes,
      items,
    });
    res.status(201).json(doc);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const doc = await service.update(id, companyId, req.body);
    res.json(doc);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/cancel", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.cancel(id, companyId, userId);
    res.json({ message: "Documento anulado" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/convert-to-invoice", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const invoice = await service.convertToInvoice(id, companyId, userId);
    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/credit-note", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const creditNote = await service.createCreditNote(id, companyId, userId, req.body.items);
    res.status(201).json(creditNote);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export const documentsRouter = router;
