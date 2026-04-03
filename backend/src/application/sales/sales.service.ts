import { InventoryMovementType, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../../config/database/prisma";
import { NotificationsService } from "../notifications/notifications.service";

const notificationsService = new NotificationsService();

export interface SaleItemInput {
  productVariantId: number;
  quantity: number;
  discount?: number;
}

export interface CreateSaleInput {
  branchId: number;
  paymentMethod: PaymentMethod;
  paymentCashAmount?: number;
  paymentCardAmount?: number;
  notes?: string;
  customerId?: number | null;
  discountTotal?: number;
  items: SaleItemInput[];
}

export class SalesService {
  async createSale(
    companyId: number,
    userId: number,
    input: CreateSaleInput,
  ) {
    if (input.items.length === 0) {
      throw new Error("NO_ITEMS");
    }

    return prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: {
          id: input.branchId,
          companyId,
        },
      });

      if (!branch) {
        throw new Error("BRANCH_NOT_FOUND");
      }

      const variantIds = input.items.map((i) => i.productVariantId);

      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: variantIds },
          companyId,
          isActive: true,
        },
      });

      if (variants.length !== variantIds.length) {
        throw new Error("INVALID_VARIANTS");
      }

      const inventoryRows = await tx.inventory.findMany({
        where: {
          companyId,
          branchId: input.branchId,
          productVariantId: { in: variantIds },
        },
      });

      const inventoryByVariant = new Map<number, number>();
      for (const inv of inventoryRows) {
        inventoryByVariant.set(inv.productVariantId, inv.quantity);
      }

      for (const item of input.items) {
        const available = inventoryByVariant.get(item.productVariantId) ?? 0;
        if (available < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      }

      let totalAmount = new Prisma.Decimal(0);
      let totalItems = 0;

      const saleItemsData = input.items.map((item) => {
        const variant = variants.find((v) => v.id === item.productVariantId)!;
        const unitPrice = variant.price;
        const itemDiscount = new Prisma.Decimal(item.discount ?? 0);
        const lineTotal = unitPrice.mul(item.quantity).sub(itemDiscount.mul(item.quantity));

        totalAmount = totalAmount.add(lineTotal);
        totalItems += item.quantity;

        return {
          companyId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice,
          discount: itemDiscount,
          totalPrice: lineTotal,
        };
      });

      const globalDiscount = new Prisma.Decimal(input.discountTotal ?? 0);
      totalAmount = totalAmount.sub(globalDiscount);
      if (totalAmount.lessThan(0)) totalAmount = new Prisma.Decimal(0);

      const sale = await tx.sale.create({
        data: {
          companyId,
          branchId: input.branchId,
          userId,
          paymentMethod: input.paymentMethod,
          totalAmount,
          totalItems,
          discountTotal: globalDiscount,
          notes: input.notes,
          paymentCashAmount: input.paymentCashAmount != null ? new Prisma.Decimal(input.paymentCashAmount) : undefined,
          paymentCardAmount: input.paymentCardAmount != null ? new Prisma.Decimal(input.paymentCardAmount) : undefined,
          ...(input.customerId != null && { customerId: input.customerId }),
        },
      });

      await tx.saleItem.createMany({
        data: saleItemsData.map((item) => ({
          ...item,
          saleId: sale.id,
        })),
      });

      for (const item of input.items) {
        await tx.inventory.updateMany({
          where: {
            companyId,
            branchId: input.branchId,
            productVariantId: item.productVariantId,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      const qtyByVariant = new Map<number, number>();
      for (const item of input.items) {
        const cur = qtyByVariant.get(item.productVariantId) ?? 0;
        qtyByVariant.set(item.productVariantId, cur + item.quantity);
      }
      for (const [productVariantId, totalQty] of qtyByVariant) {
        const before = inventoryByVariant.get(productVariantId) ?? 0;
        const after = before - totalQty;
        await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId: input.branchId,
            productVariantId,
            type: InventoryMovementType.SALE,
            quantityBefore: before,
            quantityAfter: after,
            userId,
            referenceType: "sale",
            referenceId: sale.id,
          },
        });
      }

      // If payment is CREDIT and there's a customer, create an AccountReceivable
      if (input.paymentMethod === "CREDIT" && input.customerId) {
        await tx.accountReceivable.create({
          data: {
            companyId,
            customerId: input.customerId,
            saleId: sale.id,
            amount: totalAmount,
          },
        });
      }

      return tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          branch: true,
        },
      });
    }).then((result) => {
      // Fire-and-forget: check low stock alerts after sale completes
      notificationsService.checkAndNotifyLowStock(companyId).catch(console.error);
      return result;
    });
  }

  async listSales(
    companyId: number,
    opts?: { branchId?: number; from?: string; to?: string },
  ) {
    const where: { companyId: number; branchId?: number; createdAt?: { gte?: Date; lte?: Date } } = {
      companyId,
    };
    if (opts?.branchId != null) where.branchId = opts.branchId;
    if (opts?.from || opts?.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from + "T00:00:00.000Z");
      if (opts.to) where.createdAt.lte = new Date(opts.to + "T23:59:59.999Z");
    }
    return prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: { product: { select: { name: true } } },
            },
          },
        },
        branch: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}

