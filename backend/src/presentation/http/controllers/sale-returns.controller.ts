import { Request, Response } from "express";
import { z } from "zod";
import { SaleReturnsService } from "../../../application/sales/sale-returns.service";

const returnItemsSchema = z.object({
  items: z.array(z.object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
  reason: z.string().optional(),
});

const service = new SaleReturnsService();

export const cancelSaleController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });

  const saleId = parseInt(String(req.params.id), 10);
  if (isNaN(saleId)) return res.status(400).json({ message: "Invalid sale id" });

  try {
    const result = await service.cancelSale(req.auth.companyId, req.auth.userId, saleId);
    return res.json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "SALE_NOT_FOUND") return res.status(404).json({ message: "Sale not found" });
      if (e.message === "SALE_NOT_COMPLETABLE") return res.status(409).json({ message: "Only completed sales can be cancelled" });
    }
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const returnSaleItemsController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });

  const saleId = parseInt(String(req.params.id), 10);
  if (isNaN(saleId)) return res.status(400).json({ message: "Invalid sale id" });

  const parsed = returnItemsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() });

  try {
    const result = await service.returnItems(
      req.auth.companyId,
      req.auth.userId,
      saleId,
      parsed.data.items,
      parsed.data.reason,
    );
    return res.status(201).json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "SALE_NOT_FOUND") return res.status(404).json({ message: "Sale not found" });
      if (e.message === "SALE_CANCELLED") return res.status(409).json({ message: "Sale is already cancelled" });
      if (e.message.startsWith("VARIANT_NOT_IN_SALE")) return res.status(400).json({ message: "Variant not in original sale" });
      if (e.message.startsWith("QUANTITY_EXCEEDED")) return res.status(400).json({ message: "Return quantity exceeds original quantity" });
    }
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
};
