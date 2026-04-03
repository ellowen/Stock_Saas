import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

type CreateOrderInput = {
  supplierId: number;
  branchId: number;
  expectedAt?: string;
  notes?: string;
  items: Array<{
    variantId?: number;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export class PurchaseOrderService {
  private async nextNumber(
    companyId: number,
    tx: Prisma.TransactionClient
  ): Promise<number> {
    const last = await tx.purchaseOrder.findFirst({
      where: { companyId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    return (last?.number ?? 0) + 1;
  }

  async create(companyId: number, userId: number, input: CreateOrderInput) {
    return prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(companyId, tx);
      const total = input.items.reduce(
        (sum, i) => sum + Number(i.unitPrice) * Number(i.quantity),
        0
      );

      return tx.purchaseOrder.create({
        data: {
          companyId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          userId,
          number,
          expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
          notes: input.notes ?? null,
          total,
          items: {
            create: input.items.map((item) => ({
              variantId: item.variantId ?? null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: true, supplier: true, branch: true },
      });
    });
  }

  async update(
    id: number,
    companyId: number,
    data: { notes?: string; expectedAt?: string; status?: PurchaseOrderStatus }
  ) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, companyId },
    });
    if (!order) throw new Error("Purchase order not found");
    if (order.status === "RECEIVED" || order.status === "CANCELLED") {
      throw new Error("Cannot edit a completed or cancelled order");
    }
    return prisma.purchaseOrder.update({
      where: { id },
      data: {
        notes: data.notes,
        expectedAt: data.expectedAt ? new Date(data.expectedAt) : undefined,
        status: data.status,
      },
    });
  }

  async receive(
    id: number,
    companyId: number,
    userId: number,
    receivedItems: Array<{ itemId: number; received: number }>
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({
        where: { id, companyId },
        include: { items: true },
      });
      if (!order) throw new Error("Purchase order not found");
      if (order.status === "CANCELLED") throw new Error("Order is cancelled");

      for (const recv of receivedItems) {
        const item = order.items.find((i) => i.id === recv.itemId);
        if (!item || !item.variantId) continue;

        const qty = Math.floor(recv.received);
        if (qty <= 0) continue;

        const inv = await tx.inventory.findFirst({
          where: {
            companyId,
            branchId: order.branchId,
            productVariantId: item.variantId,
          },
        });

        const before = inv?.quantity ?? 0;
        const after = before + qty;

        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: after },
          });
        } else {
          await tx.inventory.create({
            data: {
              companyId,
              branchId: order.branchId,
              productVariantId: item.variantId,
              quantity: after,
            },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId: order.branchId,
            productVariantId: item.variantId,
            type: "PURCHASE_RECEIVE",
            quantityBefore: before,
            quantityAfter: after,
            userId,
            referenceType: "purchase_order",
            referenceId: id,
          },
        });

        await tx.purchaseOrderItem.update({
          where: { id: recv.itemId },
          data: { received: { increment: qty } },
        });
      }

      // Determine new status
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { orderId: id },
      });
      const allReceived = updatedItems.every(
        (i) => Number(i.received) >= Number(i.quantity)
      );
      const anyReceived = updatedItems.some((i) => Number(i.received) > 0);

      const newStatus: PurchaseOrderStatus = allReceived
        ? "RECEIVED"
        : anyReceived
        ? "PARTIALLY_RECEIVED"
        : order.status;

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
        include: { items: true, supplier: true, branch: true },
      });
    });
  }

  async list(
    companyId: number,
    filters?: {
      status?: PurchaseOrderStatus;
      supplierId?: number;
      from?: string;
      to?: string;
    }
  ) {
    const where: Prisma.PurchaseOrderWhereInput = { companyId };
    if (filters?.status) where.status = filters.status;
    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) {
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        where.date.lte = to;
      }
    }

    return prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: number, companyId: number) {
    return prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        branch: true,
        user: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true } },
                attributes: {
                  include: { attribute: true },
                  orderBy: { attribute: { sortOrder: "asc" } },
                },
              },
            },
          },
        },
      },
    });
  }

  async cancel(id: number, companyId: number) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, companyId },
    });
    if (!order) throw new Error("Purchase order not found");
    if (order.status === "RECEIVED") {
      throw new Error("Cannot cancel a fully received order");
    }
    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }
}
