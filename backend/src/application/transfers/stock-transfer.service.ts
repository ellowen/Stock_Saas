import { StockTransferStatus } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

export interface StockTransferItemInput {
  productVariantId: number;
  quantity: number;
}

export interface CreateStockTransferInput {
  fromBranchId: number;
  toBranchId: number;
  items: StockTransferItemInput[];
}

export class StockTransferService {
  async createDraft(
    companyId: number,
    createdByUserId: number,
    input: CreateStockTransferInput,
  ) {
    if (input.items.length === 0) {
      throw new Error("NO_ITEMS");
    }

    if (input.fromBranchId === input.toBranchId) {
      throw new Error("SAME_BRANCH");
    }

    const companyBranches = await prisma.branch.findMany({
      where: {
        companyId,
        id: { in: [input.fromBranchId, input.toBranchId] },
      },
    });

    if (companyBranches.length !== 2) {
      throw new Error("BRANCH_NOT_FOUND");
    }

    const variantIds = input.items.map((i) => i.productVariantId);

    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        companyId,
        isActive: true,
      },
    });

    if (variants.length !== variantIds.length) {
      throw new Error("INVALID_VARIANTS");
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        companyId,
        fromBranchId: input.fromBranchId,
        toBranchId: input.toBranchId,
        createdByUserId,
        status: StockTransferStatus.PENDING,
        items: {
          createMany: {
            data: input.items.map((item) => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
            })),
          },
        },
      },
      include: {
        items: true,
      },
    });

    return transfer;
  }

  async complete(
    companyId: number,
    approvedByUserId: number,
    transferId: number,
  ) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findFirst({
        where: {
          id: transferId,
          companyId,
        },
        include: {
          items: true,
        },
      });

      if (!transfer) {
        throw new Error("TRANSFER_NOT_FOUND");
      }

      if (transfer.status !== StockTransferStatus.PENDING) {
        throw new Error("INVALID_STATUS");
      }

      const variantIds = transfer.items.map((i) => i.productVariantId);

      const inventoryFrom = await tx.inventory.findMany({
        where: {
          companyId,
          branchId: transfer.fromBranchId,
          productVariantId: { in: variantIds },
        },
      });

      const inventoryByVariant = new Map<number, number>();
      for (const inv of inventoryFrom) {
        inventoryByVariant.set(inv.productVariantId, inv.quantity);
      }

      for (const item of transfer.items) {
        const available = inventoryByVariant.get(item.productVariantId) ?? 0;
        if (available < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      }

      for (const item of transfer.items) {
        await tx.inventory.updateMany({
          where: {
            companyId,
            branchId: transfer.fromBranchId,
            productVariantId: item.productVariantId,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        const existingTo = await tx.inventory.findUnique({
          where: {
            companyId_branchId_productVariantId: {
              companyId,
              branchId: transfer.toBranchId,
              productVariantId: item.productVariantId,
            },
          },
        });

        if (!existingTo) {
          await tx.inventory.create({
            data: {
              companyId,
              branchId: transfer.toBranchId,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
            },
          });
        } else {
          await tx.inventory.update({
            where: { id: existingTo.id },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: StockTransferStatus.COMPLETED,
          approvedByUserId,
        },
        include: {
          items: true,
        },
      });

      return updated;
    });
  }

  async list(companyId: number) {
    return prisma.stockTransfer.findMany({
      where: { companyId },
      include: {
        items: true,
        fromBranch: true,
        toBranch: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}

