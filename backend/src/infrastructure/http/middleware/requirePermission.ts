import type { Request, Response, NextFunction } from "express";
import { PermissionKey } from "@prisma/client";
import { PermissionService } from "../../../application/permissions/permission.service";

const service = new PermissionService();

/**
 * Middleware that checks if the authenticated user has a specific permission.
 * OWNER always passes. Others are checked against role defaults + per-user overrides.
 */
export function requirePermission(key: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ message: "Unauthorized" });

    const { userId, role } = req.auth;

    try {
      const allowed = await service.hasPermission(userId, role as any, key);
      if (!allowed) return res.status(403).json({ message: `Forbidden: se requiere permiso ${key}` });
      next();
    } catch {
      res.status(500).json({ message: "Error al verificar permisos" });
    }
  };
}
