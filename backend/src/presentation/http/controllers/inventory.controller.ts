import { Request, Response } from "express";
import { z } from "zod";
import { InventoryService } from "../../../application/inventory/inventory.service";

const listSchema = z.object({
  branchId: z.coerce.number().int().optional(),
  productId: z.coerce.number().int().optional(),
  productVariantId: z.coerce.number().int().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  hideZero: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const adjustSchema = z.object({
  branchId: z.number().int().positive().optional(),
  productVariantId: z.number().int().positive(),
  quantityDelta: z.number(),
});

const setQuantitySchema = z.object({
  branchId: z.number().int().positive(),
  productVariantId: z.number().int().positive(),
  quantity: z.number().int().min(0),
});

const service = new InventoryService();

export const listInventoryController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = listSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const { page, pageSize, ...filter } = parseResult.data;
    if (page !== undefined) {
      const result = await service.listPaginated(
        req.auth.companyId,
        filter,
        { page, pageSize: pageSize ?? 15 }
      );
      return res.json(result);
    }
    const inventory = await service.list(req.auth.companyId, filter);
    return res.json(inventory);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const adjustInventoryController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = adjustSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.flatten(),
    });
  }

  const { branchId, productVariantId, quantityDelta } = parseResult.data;

  const effectiveBranchId =
    branchId ?? req.auth.branchId ?? null;

  if (!effectiveBranchId) {
    return res.status(400).json({
      message:
        "branchId is required either in body or in the authenticated context",
    });
  }

  try {
    const updated = await service.adjust({
      companyId: req.auth.companyId,
      branchId: effectiveBranchId,
      productVariantId,
      quantityDelta,
    });
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return res
        .status(409)
        .json({ message: "Insufficient stock for this operation" });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const setQuantityController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = setQuantitySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.flatten(),
    });
  }

  const { branchId, productVariantId, quantity } = parseResult.data;

  try {
    const updated = await service.setQuantity({
      companyId: req.auth.companyId,
      branchId,
      productVariantId,
      quantity,
    });
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_QUANTITY") {
      return res.status(400).json({ message: "La cantidad debe ser mayor o igual a 0" });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};
