import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

export interface InventoryFilter {
  branchId?: number;
  productId?: number;
  productVariantId?: number;
  search?: string;
  category?: string;
  hideZero?: boolean;
}

export interface InventoryPagination {
  page: number;
  pageSize: number;
}

export type InventoryListResult = {
  data: Prisma.InventoryGetPayload<{
    include: {
      branch: { select: { id: true; name: true; code: true } };
      variant: {
        select: {
          id: true;
          size: true;
          color: true;
          sku: true;
          barcode: true;
          price: true;
          product: { select: { id: true; name: true; category: true; brand: true } };
        };
      };
    };
  }>[];
  total: number;
  page: number;
  pageSize: number;
};

export interface AdjustInventoryInput {
  companyId: number;
  branchId: number;
  productVariantId: number;
  quantityDelta: number;
}

export class InventoryService {
  async list(companyId: number, filter: InventoryFilter = {}) {
    const where: Prisma.InventoryWhereInput = {
      companyId,
    };

    if (filter.branchId !== undefined) {
      where.branchId = filter.branchId;
    }

    if (filter.productVariantId !== undefined) {
      where.productVariantId = filter.productVariantId;
    }

    const productWhere: Prisma.ProductWhereInput = {};
    if (filter.productId !== undefined) {
      productWhere.id = filter.productId;
    }
    if (filter.search !== undefined && filter.search.trim() !== "") {
      productWhere.name = { contains: filter.search.trim() };
    }
    if (filter.category !== undefined && filter.category.trim() !== "") {
      productWhere.category = { equals: filter.category.trim() };
    }
    if (Object.keys(productWhere).length > 0) {
      where.variant = { product: productWhere };
    }

    if (filter.hideZero === true) {
      where.quantity = { gt: 0 };
    }

    return prisma.inventory.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        variant: {
          select: {
            id: true,
            size: true,
            color: true,
            sku: true,
            barcode: true,
            price: true,
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                brand: true,
              },
            },
          },
        },
      },
      orderBy: [{ branchId: "asc" }, { productVariantId: "asc" }],
    });
  }

  async listPaginated(
    companyId: number,
    filter: InventoryFilter = {},
    pagination: InventoryPagination = { page: 1, pageSize: 15 }
  ): Promise<InventoryListResult> {
    const where: Prisma.InventoryWhereInput = {
      companyId,
    };

    if (filter.branchId !== undefined) {
      where.branchId = filter.branchId;
    }

    if (filter.productVariantId !== undefined) {
      where.productVariantId = filter.productVariantId;
    }

    const productWherePaginated: Prisma.ProductWhereInput = {};
    if (filter.productId !== undefined) {
      productWherePaginated.id = filter.productId;
    }
    if (filter.search !== undefined && filter.search.trim() !== "") {
      productWherePaginated.name = { contains: filter.search.trim() };
    }
    if (filter.category !== undefined && filter.category.trim() !== "") {
      productWherePaginated.category = { equals: filter.category.trim() };
    }
    if (Object.keys(productWherePaginated).length > 0) {
      where.variant = { product: productWherePaginated };
    }

    if (filter.hideZero === true) {
      where.quantity = { gt: 0 };
    }

    const [data, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          variant: {
            select: {
              id: true,
              size: true,
              color: true,
              sku: true,
              barcode: true,
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  brand: true,
                },
              },
            },
          },
        },
        orderBy: [{ branchId: "asc" }, { productVariantId: "asc" }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.inventory.count({ where }),
    ]);

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async adjust(input: AdjustInventoryInput) {
    const { companyId, branchId, productVariantId, quantityDelta } = input;

    return prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: {
          companyId_branchId_productVariantId: {
            companyId,
            branchId,
            productVariantId,
          },
        },
      });

      const newQuantity = (existing?.quantity ?? 0) + quantityDelta;

      if (newQuantity < 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      if (!existing) {
        return tx.inventory.create({
          data: {
            companyId,
            branchId,
            productVariantId,
            quantity: newQuantity,
          },
        });
      }

      return tx.inventory.update({
        where: { id: existing.id },
        data: {
          quantity: newQuantity,
        },
      });
    });
  }

  async setQuantity(input: {
    companyId: number;
    branchId: number;
    productVariantId: number;
    quantity: number;
  }) {
    const { companyId, branchId, productVariantId, quantity } = input;
    if (quantity < 0) {
      throw new Error("INVALID_QUANTITY");
    }
    return prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: {
          companyId_branchId_productVariantId: {
            companyId,
            branchId,
            productVariantId,
          },
        },
      });
      if (!existing) {
        return tx.inventory.create({
          data: {
            companyId,
            branchId,
            productVariantId,
            quantity,
          },
        });
      }
      return tx.inventory.update({
        where: { id: existing.id },
        data: { quantity },
      });
    });
  }
}

