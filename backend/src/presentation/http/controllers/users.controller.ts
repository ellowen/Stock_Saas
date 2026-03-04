import type { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../../config/database/prisma";
import { UserRole } from "@prisma/client";

const createUserSchema = z.object({
  username: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  branchId: z.number().int().positive().optional().nullable(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  role: z.nativeEnum(UserRole).optional(),
  branchId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function listUsersController(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.auth.companyId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { fullName: "asc" },
    });
    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
}

export async function createUserController(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { username: parsed.data.username.trim() } });
    if (existing) {
      return res.status(409).json({ message: "Ya existe un usuario con ese nombre de usuario" });
    }
    if (parsed.data.branchId != null) {
      const branch = await prisma.branch.findFirst({
        where: { id: parsed.data.branchId, companyId: req.auth.companyId },
      });
      if (!branch) {
        return res.status(400).json({ message: "La sucursal no pertenece a tu empresa" });
      }
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        companyId: req.auth.companyId,
        username: parsed.data.username.trim(),
        email: parsed.data.email ?? undefined,
        password: passwordHash,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
        branchId: parsed.data.branchId ?? undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });
    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
}

export async function updateUserController(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
  }
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: req.auth.companyId },
    });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const updateData: { fullName?: string; email?: string | null; role?: UserRole; branchId?: number | null; isActive?: boolean; password?: string } = {};
    if (parsed.data.fullName != null) updateData.fullName = parsed.data.fullName;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email ?? null;
    if (parsed.data.role != null) updateData.role = parsed.data.role;
    if (parsed.data.branchId !== undefined) updateData.branchId = parsed.data.branchId ?? null;
    if (parsed.data.isActive != null) updateData.isActive = parsed.data.isActive;
    if (parsed.data.password != null && parsed.data.password !== "") {
      updateData.password = await bcrypt.hash(parsed.data.password, 10);
    }
    if (parsed.data.branchId != null) {
      const branch = await prisma.branch.findFirst({
        where: { id: parsed.data.branchId, companyId: req.auth.companyId },
      });
      if (!branch) {
        return res.status(400).json({ message: "La sucursal no pertenece a tu empresa" });
      }
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });
    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
}

export async function deleteUserController(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: req.auth.companyId },
    });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    if (user.role === "OWNER") {
      const ownersCount = await prisma.user.count({
        where: { companyId: req.auth.companyId, role: "OWNER", isActive: true },
      });
      if (ownersCount <= 1) {
        return res.status(400).json({ message: "No se puede eliminar el único dueño de la empresa" });
      }
    }
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
}
