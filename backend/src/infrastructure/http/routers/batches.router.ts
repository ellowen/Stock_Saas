import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../../../config/database/prisma";

const router = Router();
router.use(authMiddleware);

// GET /batches?branchId=&variantId=&expiresBefore=
router.get("/", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  const variantId = req.query.variantId ? Number(req.query.variantId) : undefined;
  const expiresBefore = req.query.expiresBefore ? new Date(req.query.expiresBefore as string) : undefined;

  try {
    const batches = await prisma.batch.findMany({
      where: {
        companyId: req.auth.companyId,
        ...(branchId && { branchId }),
        ...(variantId && { variantId }),
        ...(expiresBefore && { expiresAt: { lte: expiresBefore } }),
      },
      include: {
        variant: {
          select: {
            id: true, sku: true, size: true, color: true,
            product: { select: { id: true, name: true } },
          },
        },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
    });
    return res.json(batches);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

// POST /batches
router.post("/", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const schema = z.object({
    variantId: z.number().int().positive(),
    branchId: z.number().int().positive(),
    batchNumber: z.string().min(1).max(100),
    expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
    quantity: z.number().int().min(0).default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() });
  try {
    const batch = await prisma.batch.create({
      data: {
        companyId: req.auth.companyId,
        variantId: parsed.data.variantId,
        branchId: parsed.data.branchId,
        batchNumber: parsed.data.batchNumber,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        quantity: parsed.data.quantity,
      },
    });
    return res.status(201).json(batch);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

// PATCH /batches/:id
router.patch("/:id", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const schema = z.object({
    batchNumber: z.string().min(1).max(100).optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    quantity: z.number().int().min(0).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body", errors: parsed.error.flatten() });
  try {
    const existing = await prisma.batch.findFirst({
      where: { id: Number(req.params.id), companyId: req.auth.companyId },
    });
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await prisma.batch.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.batchNumber && { batchNumber: parsed.data.batchNumber }),
        ...(parsed.data.expiresAt !== undefined && {
          expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        }),
        ...(parsed.data.quantity !== undefined && { quantity: parsed.data.quantity }),
      },
    });
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

// DELETE /batches/:id
router.delete("/:id", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  try {
    const existing = await prisma.batch.findFirst({
      where: { id: Number(req.params.id), companyId: req.auth.companyId },
    });
    if (!existing) return res.status(404).json({ message: "Not found" });
    await prisma.batch.delete({ where: { id: existing.id } });
    return res.json({ message: "Deleted" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
});

export const batchesRouter = router;
