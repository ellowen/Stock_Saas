import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../../config/database/prisma";

const createBranchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

export async function listBranchesController(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  try {
    const branches = await prisma.branch.findMany({
      where: { companyId: req.auth.companyId, isActive: true },
      select: { id: true, name: true, code: true, address: true, city: true, phone: true },
      orderBy: { name: "asc" },
    });
    return res.json(branches);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
}

export async function createBranchController(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const parsed = createBranchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
  }
  try {
    const branch = await prisma.branch.create({
      data: {
        companyId: req.auth.companyId,
        name: parsed.data.name,
        code: parsed.data.code,
        address: parsed.data.address,
        city: parsed.data.city,
        phone: parsed.data.phone,
      },
    });
    return res.status(201).json(branch);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return res.status(409).json({ message: "Ya existe una sucursal con ese código en la empresa" });
    }
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
}

export async function deleteBranchController(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "ID de sucursal inválido" });
  }
  try {
    const branch = await prisma.branch.findFirst({
      where: { id, companyId: req.auth.companyId },
    });
    if (!branch) {
      return res.status(404).json({ message: "Sucursal no encontrada" });
    }
    await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
}
