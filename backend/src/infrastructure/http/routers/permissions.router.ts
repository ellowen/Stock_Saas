import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { PermissionService, PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_DEFAULTS, ALL_PERMISSIONS } from "../../../application/permissions/permission.service";
import { prisma } from "../../../config/database/prisma";
import { PermissionKey } from "@prisma/client";

const router = Router();
const service = new PermissionService();

router.use(authMiddleware);

// GET /permissions/meta — permission groups + labels for UI
router.get("/meta", (req: Request, res: Response) => {
  res.json({ groups: PERMISSION_GROUPS, labels: PERMISSION_LABELS, defaults: ROLE_DEFAULTS, all: ALL_PERMISSIONS });
});

// GET /permissions/users/:userId — get effective permissions for a user
router.get("/users/:userId", requireRole(["OWNER", "MANAGER"]), async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = parseInt(req.params["userId"] as string);
  if (isNaN(userId)) return res.status(400).json({ message: "ID invalido" });

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  const perms = await service.getPermissionsForUser(userId, user.role);
  res.json({ userId, role: user.role, permissions: perms });
});

// PUT /permissions/users/:userId — set permission overrides for a user
router.put("/users/:userId", requireRole(["OWNER"]), async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = parseInt(req.params["userId"] as string);
  if (isNaN(userId)) return res.status(400).json({ message: "ID invalido" });

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  // Prevent modifying OWNER permissions
  if (user.role === "OWNER") return res.status(400).json({ message: "No se pueden modificar los permisos del OWNER" });

  const { grants } = req.body as { grants: PermissionKey[] };
  if (!Array.isArray(grants)) return res.status(400).json({ message: "grants debe ser un array" });

  try {
    await service.setPermissions(userId, user.role, grants);
    const updated = await service.getPermissionsForUser(userId, user.role);
    res.json({ userId, role: user.role, permissions: updated });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /permissions/users/:userId — reset to role defaults
router.delete("/users/:userId", requireRole(["OWNER"]), async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = parseInt(req.params["userId"] as string);
  if (isNaN(userId)) return res.status(400).json({ message: "ID invalido" });

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  await prisma.userPermission.deleteMany({ where: { userId } });
  res.json({ message: "Permisos reseteados a los valores del rol" });
});

export const permissionsRouter = router;
