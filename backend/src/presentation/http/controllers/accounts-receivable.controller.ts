import { Request, Response } from "express";
import { ARStatus, PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { AccountsReceivableService } from "../../../application/accounts/accounts-receivable.service";

const createSchema = z.object({
  customerId: z.number().int().positive(),
  saleId: z.number().int().positive().optional(),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

const listSchema = z.object({
  customerId: z.coerce.number().int().optional(),
  status: z.nativeEnum(ARStatus).optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  notes: z.string().optional(),
});

const service = new AccountsReceivableService();

export const createARController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() });
  try {
    const ar = await service.create(req.auth.companyId, parsed.data);
    return res.status(201).json(ar);
  } catch (e) {
    if (e instanceof Error && e.message === "CUSTOMER_NOT_FOUND") return res.status(404).json({ message: "Customer not found" });
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const listARController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });
  try {
    const result = await service.list(req.auth.companyId, parsed.data);
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const addARPaymentController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() });
  try {
    const result = await service.addPayment(req.auth.companyId, id, parsed.data);
    return res.json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "AR_NOT_FOUND") return res.status(404).json({ message: "Account receivable not found" });
      if (e.message === "AR_ALREADY_PAID") return res.status(409).json({ message: "Already fully paid" });
      if (e.message === "PAYMENT_EXCEEDS_BALANCE") return res.status(400).json({ message: "Payment exceeds remaining balance" });
    }
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const getARSummaryController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  try {
    const summary = await service.getTotalPending(req.auth.companyId);
    return res.json(summary);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
};
