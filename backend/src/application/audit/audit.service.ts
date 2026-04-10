import { prisma } from "../../config/database/prisma";

export interface AuditLogInput {
  companyId: number;
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  before?: object | null;
  after?: object | null;
  ip?: string | null;
}

export class AuditService {
  /**
   * Registra una entrada de auditoría. Fire-and-forget — no lanza excepciones
   * para no bloquear el flujo principal.
   */
  async log(data: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          companyId: data.companyId,
          userId: data.userId ?? undefined,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId ?? undefined,
          before: data.before ?? undefined,
          after: data.after ?? undefined,
          ip: data.ip ?? undefined,
        },
      });
    } catch (err) {
      // Never let audit logging break the main flow
      console.error("[AuditService] Failed to write audit log:", err);
    }
  }

  async list(
    companyId: number,
    opts: {
      entity?: string;
      action?: string;
      userId?: number;
      entityId?: number;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where: {
      companyId: number;
      entity?: string;
      action?: string;
      userId?: number;
      entityId?: number;
      createdAt?: { gte?: Date; lte?: Date };
    } = { companyId };

    if (opts.entity) where.entity = opts.entity;
    if (opts.action) where.action = opts.action;
    if (opts.userId) where.userId = opts.userId;
    if (opts.entityId) where.entityId = opts.entityId;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from + "T00:00:00.000Z");
      if (opts.to) where.createdAt.lte = new Date(opts.to + "T23:59:59.999Z");
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}

// Singleton para usar en controllers (fire-and-forget)
export const auditService = new AuditService();
