import { Request, Response } from "express";
import { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { SalesService } from "../../../application/sales/sales.service";

const saleItemSchema = z.object({
  productVariantId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  discount: z.number().min(0).optional(),
});

const createSaleSchema = z.object({
  branchId: z.number().int().positive().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentCashAmount: z.number().min(0).optional(),
  paymentCardAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  customerId: z.number().int().positive().optional().nullable(),
  discountTotal: z.number().min(0).optional(),
  items: z.array(saleItemSchema).min(1),
});

const listSalesSchema = z.object({
  branchId: z.coerce.number().int().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const service = new SalesService();

export const createSaleController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = createSaleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.flatten(),
    });
  }

  const { branchId, ...rest } = parseResult.data;

  const effectiveBranchId =
    branchId ?? req.auth.branchId ?? null;

  if (!effectiveBranchId) {
    return res.status(400).json({
      message:
        "branchId is required either in body or in the authenticated context",
    });
  }

  try {
    const sale = await service.createSale(req.auth.companyId, req.auth.userId, {
      branchId: effectiveBranchId,
      ...rest,
    });
    return res.status(201).json(sale);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NO_ITEMS") {
        return res.status(400).json({ message: "Sale requires at least one item" });
      }
      if (error.message === "BRANCH_NOT_FOUND") {
        return res.status(404).json({ message: "Branch not found for this company" });
      }
      if (error.message === "INVALID_VARIANTS") {
        return res.status(400).json({ message: "Some product variants are invalid or inactive" });
      }
      if (error.message === "INSUFFICIENT_STOCK") {
        return res
          .status(409)
          .json({ message: "Insufficient stock to complete the sale" });
      }
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const listSalesController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = listSalesSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const sales = await service.listSales(req.auth.companyId, {
      branchId: parseResult.data.branchId,
      from: parseResult.data.from,
      to: parseResult.data.to,
    });
    return res.json(sales);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

