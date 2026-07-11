import { Request, Response } from "express";
import { z } from "zod";
import { PromotionService } from "../../../application/promotions/promotion.service";

const promotionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["PERCENT_OFF", "BUY_X_GET_Y_FREE"]),
  scope: z.enum(["ALL", "PRODUCT", "CATEGORY"]),
  productId: z.number().int().positive().optional().nullable(),
  category: z.string().optional().nullable(),
  percentOff: z.number().min(0).max(1).optional().nullable(),
  buyQty: z.number().int().positive().optional().nullable(),
  freeQty: z.number().int().positive().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});

const previewSchema = z.object({
  items: z.array(
    z.object({
      productVariantId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().min(0),
    })
  ),
});

const couponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
});

const service = new PromotionService();

export const listPromotionsController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const promotions = await service.list(req.auth.companyId);
  res.json(promotions);
};

export const createPromotionController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const parsed = promotionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
  try {
    const promo = await service.create(req.auth.companyId, parsed.data);
    res.status(201).json(promo);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const updatePromotionController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  const parsed = promotionSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
  try {
    const promo = await service.update(id, req.auth.companyId, parsed.data);
    res.json(promo);
  } catch (err: any) {
    if (err.message === "PROMOTION_NOT_FOUND") return res.status(404).json({ message: "Promoción no encontrada" });
    res.status(400).json({ message: err.message });
  }
};

export const deletePromotionController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.delete(id, req.auth.companyId);
    res.json({ message: "Promoción eliminada" });
  } catch (err: any) {
    if (err.message === "PROMOTION_NOT_FOUND") return res.status(404).json({ message: "Promoción no encontrada" });
    res.status(400).json({ message: err.message });
  }
};

/** Preview solo para mostrar en el POS — el calculo real y autoritativo pasa de nuevo en sales.service al crear la venta. */
export const previewPromotionsController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
  const discounts = await service.computeAutoDiscounts(req.auth.companyId, parsed.data.items);
  res.json({ discounts: Object.fromEntries(discounts) });
};

export const validateCouponController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
  try {
    const discount = await service.applyCoupon(req.auth.companyId, parsed.data.code, parsed.data.subtotal);
    res.json({ discount });
  } catch (err: any) {
    if (err.message === "INVALID_COUPON") return res.status(404).json({ message: "Cupón inválido" });
    if (err.message === "EXPIRED_COUPON") return res.status(400).json({ message: "Cupón vencido" });
    res.status(400).json({ message: err.message });
  }
};
