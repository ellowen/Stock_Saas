import { Router, Request, Response } from "express";
import { PurchaseOrderStatus } from "@prisma/client";
import { authMiddleware } from "../middleware/auth";
import { PurchaseOrderService } from "../../../application/purchase-orders/purchase-order.service";

const router = Router();
const service = new PurchaseOrderService();

router.use(authMiddleware);

router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { status, supplierId, from, to } = req.query as Record<string, string>;
  const orders = await service.list(companyId, {
    status: status as PurchaseOrderStatus | undefined,
    supplierId: supplierId ? parseInt(supplierId) : undefined,
    from,
    to,
  });
  res.json(orders);
});

router.get("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  const order = await service.getById(id, companyId);
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const { supplierId, branchId, expectedAt, notes, items } = req.body;
  if (!supplierId || !branchId || !items?.length) {
    return res.status(400).json({ message: "supplierId, branchId e items son requeridos" });
  }
  try {
    const order = await service.create(companyId, userId, {
      supplierId: parseInt(supplierId),
      branchId: parseInt(branchId),
      expectedAt,
      notes,
      items,
    });
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const order = await service.update(id, companyId, req.body);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/receive", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  const { items } = req.body;
  if (!items?.length) {
    return res.status(400).json({ message: "items requeridos" });
  }
  try {
    const order = await service.receive(id, companyId, userId, items);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/cancel", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.cancel(id, companyId);
    res.json({ message: "Orden cancelada" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export const purchaseOrdersRouter = router;
