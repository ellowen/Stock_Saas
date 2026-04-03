import { prisma } from "../../config/database/prisma";
import { StockCountStatus, InventoryMovementType } from "@prisma/client";

export class StockCountService {
  async create(companyId: number, branchId: number, userId: number, notes?: string) {
    // Snapshot current inventory for the branch
    const inventory = await prisma.inventory.findMany({
      where: { companyId, branchId },
      select: { productVariantId: true, quantity: true },
    });

    return prisma.stockCount.create({
      data: {
        companyId,
        branchId,
        createdBy: userId,
        notes,
        items: {
          create: inventory.map((inv) => ({
            variantId: inv.productVariantId,
            systemQty: inv.quantity,
          })),
        },
      },
      include: { branch: { select: { id: true, name: true, code: true } } },
    });
  }

  async list(companyId: number, branchId?: number) {
    return prisma.stockCount.findMany({
      where: { companyId, ...(branchId && { branchId }) },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(companyId: number, id: number) {
    const count = await prisma.stockCount.findFirst({
      where: { companyId, id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true } },
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                attributes: {
                  include: { attribute: { select: { name: true } } },
                  orderBy: { attribute: { sortOrder: "asc" } },
                },
                product: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!count) throw new Error("NOT_FOUND");
    return count;
  }

  async updateItems(
    companyId: number,
    id: number,
    updates: Array<{ itemId: number; countedQty: number | null }>
  ) {
    const count = await prisma.stockCount.findFirst({ where: { companyId, id } });
    if (!count) throw new Error("NOT_FOUND");
    if (count.status !== StockCountStatus.OPEN) throw new Error("NOT_OPEN");

    await prisma.$transaction(
      updates.map((u) =>
        prisma.stockCountItem.update({
          where: { id: u.itemId },
          data: { countedQty: u.countedQty },
        })
      )
    );
    return { updated: updates.length };
  }

  async apply(companyId: number, id: number, userId: number) {
    const count = await prisma.stockCount.findFirst({
      where: { companyId, id },
      include: { items: true },
    });
    if (!count) throw new Error("NOT_FOUND");
    if (count.status !== StockCountStatus.OPEN) throw new Error("NOT_OPEN");

    const toApply = count.items.filter((item) => item.countedQty !== null);
    if (toApply.length === 0) throw new Error("NO_ITEMS");

    await prisma.$transaction(async (tx) => {
      for (const item of toApply) {
        const newQty = item.countedQty!;
        const existing = await tx.inventory.findUnique({
          where: {
            companyId_branchId_productVariantId: {
              companyId,
              branchId: count.branchId,
              productVariantId: item.variantId,
            },
          },
        });
        const before = existing?.quantity ?? 0;
        if (!existing) {
          await tx.inventory.create({
            data: { companyId, branchId: count.branchId, productVariantId: item.variantId, quantity: newQty },
          });
        } else {
          await tx.inventory.update({ where: { id: existing.id }, data: { quantity: newQty } });
        }
        await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId: count.branchId,
            productVariantId: item.variantId,
            type: InventoryMovementType.MANUAL_ADJUST,
            quantityBefore: before,
            quantityAfter: newQty,
            userId,
            referenceType: "STOCK_COUNT",
            referenceId: count.id,
          },
        });
      }
      await tx.stockCount.update({
        where: { id },
        data: { status: StockCountStatus.APPLIED, closedAt: new Date() },
      });
    });

    return { applied: toApply.length };
  }

  async cancel(companyId: number, id: number) {
    const count = await prisma.stockCount.findFirst({ where: { companyId, id } });
    if (!count) throw new Error("NOT_FOUND");
    if (count.status !== StockCountStatus.OPEN) throw new Error("NOT_OPEN");
    return prisma.stockCount.update({
      where: { id },
      data: { status: StockCountStatus.CANCELLED, closedAt: new Date() },
    });
  }
}
