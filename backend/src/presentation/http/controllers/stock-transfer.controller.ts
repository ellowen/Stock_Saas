import { Request, Response } from "express";
import { z } from "zod";
import { StockTransferService } from "../../../application/transfers/stock-transfer.service";

const transferItemSchema = z.object({
  productVariantId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createTransferSchema = z.object({
  fromBranchId: z.number().int().positive(),
  toBranchId: z.number().int().positive(),
  items: z.array(transferItemSchema).min(1),
});

const completeTransferSchema = z.object({
  transferId: z.number().int().positive(),
});

const service = new StockTransferService();

export const createTransferController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = createTransferSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const transfer = await service.createDraft(
      req.auth.companyId,
      req.auth.userId,
      parseResult.data,
    );
    return res.status(201).json(transfer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NO_ITEMS") {
        return res
          .status(400)
          .json({ message: "Transfer requires at least one item" });
      }
      if (error.message === "SAME_BRANCH") {
        return res
          .status(400)
          .json({ message: "fromBranchId and toBranchId must be different" });
      }
      if (error.message === "BRANCH_NOT_FOUND") {
        return res.status(404).json({
          message: "Both branches must belong to the authenticated company",
        });
      }
      if (error.message === "INVALID_VARIANTS") {
        return res.status(400).json({
          message: "Some product variants are invalid or inactive for company",
        });
      }
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const completeTransferController = async (
  req: Request,
  res: Response,
) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = completeTransferSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const transfer = await service.complete(
      req.auth.companyId,
      req.auth.userId,
      parseResult.data.transferId,
    );
    return res.status(200).json(transfer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TRANSFER_NOT_FOUND") {
        return res.status(404).json({ message: "Transfer not found" });
      }
      if (error.message === "INVALID_STATUS") {
        return res.status(400).json({
          message: "Only PENDING transfers can be completed",
        });
      }
      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(409).json({
          message: "Insufficient stock in origin branch to complete transfer",
        });
      }
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const listTransfersController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const transfers = await service.list(req.auth.companyId);
    return res.json(transfers);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

