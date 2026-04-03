import { InventoryMovementType, Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

export interface ReturnItemInput {
  variantId: number;
  quantity: number;
}

export class SaleReturnsService {
  async cancelSale(companyId: number, userId: number, saleId: number) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, companyId },
        include: { items: true },
      });

      if (!sale) throw new Error("SALE_NOT_FOUND");
      if (sale.status !== SaleStatus.COMPLETED) throw new Error("SALE_NOT_COMPLETABLE");

      // Restore stock for each item
      for (const item of sale.items) {
        const inv = await tx.inventory.findUnique({
          where: {
            companyId_branchId_productVariantId: {
              companyId,
              branchId: sale.branchId,
              productVariantId: item.productVariantId,
            },
          },
        });
        const before = inv?.quantity ?? 0;
        const after = before + item.quantity;

        await tx.inventory.upsert({
          where: {
            companyId_branchId_productVariantId: {
              companyId,
              branchId: sale.branchId,
              productVariantId: item.productVariantId,
            },
          },
          create: {
            companyId,
            branchId: sale.branchId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          },
          update: { quantity: { increment: item.quantity } },
        });

        await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId: sale.branchId,
            productVariantId: item.productVariantId,
            type: InventoryMovementType.SALE_RETURN,
            quantityBefore: before,
            quantityAfter: after,
            userId,
            referenceType: "sale_cancel",
            referenceId: saleId,
          },
        });
      }

      await tx.sale.update({
        where: { id: saleId },
        data: { status: SaleStatus.CANCELLED },
      });

      return { ok: true };
    });
  }

  async returnItems(
    companyId: number,
    userId: number,
    saleId: number,
    items: ReturnItemInput[],
    reason?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, companyId },
        include: { items: true },
      });

      if (!sale) throw new Error("SALE_NOT_FOUND");
      if (sale.status === SaleStatus.CANCELLED) throw new Error("SALE_CANCELLED");

      // Validate return quantities against original items
      for (const ret of items) {
        const original = sale.items.find((i) => i.productVariantId === ret.variantId);
        if (!original) throw new Error(`VARIANT_NOT_IN_SALE:${ret.variantId}`);
        if (ret.quantity > original.quantity) throw new Error(`QUANTITY_EXCEEDED:${ret.variantId}`);
      }

      let total = new Prisma.Decimal(0);

      for (const ret of items) {
        const original = sale.items.find((i) => i.productVariantId === ret.variantId)!;
        const lineTotal = original.unitPrice.mul(ret.quantity);
        total = total.add(lineTotal);

        const inv = await tx.inventory.findUnique({
          where: {
            companyId_branchId_productVariantId: {
              companyId,
              branchId: sale.branchId,
              productVariantId: ret.variantId,
            },
          },
        });
        const before = inv?.quantity ?? 0;
        const after = before + ret.quantity;

        await tx.inventory.upsert({
          where: {
            companyId_branchId_productVariantId: {
              companyId,
              branchId: sale.branchId,
              productVariantId: ret.variantId,
            },
          },
          create: {
            companyId,
            branchId: sale.branchId,
            productVariantId: ret.variantId,
            quantity: ret.quantity,
          },
          update: { quantity: { increment: ret.quantity } },
        });

        await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId: sale.branchId,
            productVariantId: ret.variantId,
            type: InventoryMovementType.SALE_RETURN,
            quantityBefore: before,
            quantityAfter: after,
            userId,
            referenceType: "sale_return",
            referenceId: saleId,
          },
        });
      }

      const saleReturn = await tx.saleReturn.create({
        data: {
          saleId,
          companyId,
          userId,
          reason: reason ?? null,
          total,
          items: {
            create: items.map((i) => {
              const orig = sale.items.find((s) => s.productVariantId === i.variantId)!;
              return {
                variantId: i.variantId,
                quantity: i.quantity,
                unitPrice: orig.unitPrice,
              };
            }),
          },
        },
        include: { items: true },
      });

      // If all items have been returned, mark the sale as REFUNDED
      const allReturned = sale.items.every((orig) => {
        const returned = items.find((r) => r.variantId === orig.productVariantId);
        return returned && returned.quantity >= orig.quantity;
      });
      if (allReturned) {
        await tx.sale.update({
          where: { id: saleId },
          data: { status: SaleStatus.REFUNDED },
        });
      }

      return saleReturn;
    });
  }
}
