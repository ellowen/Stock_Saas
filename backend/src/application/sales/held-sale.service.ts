import { prisma } from "../../config/database/prisma";

export interface CreateHeldSaleInput {
  branchId: number;
  customerId?: number | null;
  note?: string;
  cart: unknown;
  discountTotal?: number;
}

export class HeldSaleService {
  async list(companyId: number, branchId?: number) {
    return prisma.heldSale.findMany({
      where: { companyId, ...(branchId ? { branchId } : {}) },
      include: {
        customer: { select: { id: true, name: true, taxId: true, phone: true, email: true } },
        user: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(companyId: number, userId: number, input: CreateHeldSaleInput) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, companyId } });
    if (!branch) throw new Error("BRANCH_NOT_FOUND");

    return prisma.heldSale.create({
      data: {
        companyId,
        branchId: input.branchId,
        userId,
        customerId: input.customerId ?? undefined,
        note: input.note,
        cart: input.cart as any,
        discountTotal: input.discountTotal ?? 0,
      },
    });
  }

  /** Devuelve los datos de la venta en espera y la borra en la misma transaccion (evita retomarla dos veces). */
  async resume(id: number, companyId: number) {
    return prisma.$transaction(async (tx) => {
      const held = await tx.heldSale.findFirst({
        where: { id, companyId },
        include: {
          customer: { select: { id: true, name: true, taxId: true, phone: true, email: true } },
        },
      });
      if (!held) throw new Error("HELD_SALE_NOT_FOUND");
      await tx.heldSale.delete({ where: { id } });
      return held;
    });
  }

  async discard(id: number, companyId: number) {
    const held = await prisma.heldSale.findFirst({ where: { id, companyId } });
    if (!held) throw new Error("HELD_SALE_NOT_FOUND");
    await prisma.heldSale.delete({ where: { id } });
  }
}
