import { Request, Response } from "express";
import { z } from "zod";
import { HeldSaleService } from "../../../application/sales/held-sale.service";

const cartItemSchema = z.object({
  productVariantId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  discount: z.number().min(0).optional(),
  unitPriceOverride: z.number().min(0).optional(),
});

const createHeldSaleSchema = z.object({
  branchId: z.number().int().positive(),
  customerId: z.number().int().positive().optional().nullable(),
  note: z.string().max(200).optional(),
  cart: z.array(cartItemSchema).min(1),
  discountTotal: z.number().min(0).optional(),
});

const service = new HeldSaleService();

export const listHeldSalesController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
  const heldSales = await service.list(req.auth.companyId, branchId);
  res.json(heldSales);
};

export const createHeldSaleController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const parseResult = createHeldSaleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.flatten() });
  }
  try {
    const held = await service.create(req.auth.companyId, req.auth.userId, parseResult.data);
    res.status(201).json(held);
  } catch (err: any) {
    if (err.message === "BRANCH_NOT_FOUND") return res.status(404).json({ message: "Sucursal no encontrada" });
    res.status(400).json({ message: err.message });
  }
};

export const resumeHeldSaleController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const held = await service.resume(id, req.auth.companyId);
    res.json(held);
  } catch (err: any) {
    if (err.message === "HELD_SALE_NOT_FOUND") return res.status(404).json({ message: "Venta en espera no encontrada" });
    res.status(400).json({ message: err.message });
  }
};

export const discardHeldSaleController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.discard(id, req.auth.companyId);
    res.json({ message: "Venta en espera eliminada" });
  } catch (err: any) {
    if (err.message === "HELD_SALE_NOT_FOUND") return res.status(404).json({ message: "Venta en espera no encontrada" });
    res.status(400).json({ message: err.message });
  }
};
