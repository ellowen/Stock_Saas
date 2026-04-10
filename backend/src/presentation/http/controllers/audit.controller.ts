import type { Request, Response } from "express";
import { AuditService } from "../../../application/audit/audit.service";

const auditService = new AuditService();

export async function listAuditLogsController(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });

  const {
    entity,
    action,
    userId,
    entityId,
    from,
    to,
    page,
    pageSize,
  } = req.query as Record<string, string | undefined>;

  try {
    const result = await auditService.list(req.auth.companyId, {
      entity: entity || undefined,
      action: action || undefined,
      userId: userId ? Number(userId) : undefined,
      entityId: entityId ? Number(entityId) : undefined,
      from: from || undefined,
      to: to || undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
    });
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
}
