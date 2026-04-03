import { Prisma } from "@prisma/client";
import { InventoryMovementType } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

export interface InventoryFilter {
  branchId?: number;
  productId?: number;
  productVariantId?: number;
  search?: string;
  category?: string;
  brand?: string;
  hideZero?: boolean;
  lowStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
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
  userId?: number;
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
    if (filter.brand !== undefined && filter.brand.trim() !== "") {
      productWhere.brand = { equals: filter.brand.trim() };
    }
    const variantWhere: Prisma.ProductVariantWhereInput = { isActive: true };
    if (Object.keys(productWhere).length > 0) {
      variantWhere.product = productWhere;
    }
    const priceCond: { gte?: number; lte?: number } = {};
    if (filter.minPrice !== undefined && filter.minPrice >= 0) priceCond.gte = filter.minPrice;
    if (filter.maxPrice !== undefined && filter.maxPrice >= 0) priceCond.lte = filter.maxPrice;
    if (Object.keys(priceCond).length > 0) variantWhere.price = priceCond;
    if (Object.keys(variantWhere).length > 0) where.variant = variantWhere;

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
    if (filter.brand !== undefined && filter.brand.trim() !== "") {
      productWherePaginated.brand = { equals: filter.brand.trim() };
    }
    const variantWherePaginated: Prisma.ProductVariantWhereInput = { isActive: true };
    if (Object.keys(productWherePaginated).length > 0) {
      variantWherePaginated.product = productWherePaginated;
    }
    const priceCondPaginated: { gte?: number; lte?: number } = {};
    if (filter.minPrice !== undefined && filter.minPrice >= 0) priceCondPaginated.gte = filter.minPrice;
    if (filter.maxPrice !== undefined && filter.maxPrice >= 0) priceCondPaginated.lte = filter.maxPrice;
    if (Object.keys(priceCondPaginated).length > 0) variantWherePaginated.price = priceCondPaginated;
    if (Object.keys(variantWherePaginated).length > 0) {
      where.variant = variantWherePaginated;
    }

    if (filter.hideZero === true) {
      where.quantity = { gt: 0 };
    }

    if (filter.lowStockOnly === true) {
      return this.listPaginatedLowStockOnly(companyId, filter, pagination);
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

  private async listPaginatedLowStockOnly(
    companyId: number,
    filter: InventoryFilter,
    pagination: InventoryPagination
  ): Promise<InventoryListResult> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`i.company_id = ${companyId}`,
      Prisma.sql`(i.quantity <= COALESCE(i.min_stock, 4))`,
      Prisma.sql`pv.is_active = true`,
      Prisma.sql`p.is_active = true`,
    ];
    if (filter.branchId !== undefined) {
      conditions.push(Prisma.sql`i.branch_id = ${filter.branchId}`);
    }
    if (filter.search !== undefined && filter.search.trim() !== "") {
      conditions.push(Prisma.sql`p.name ILIKE ${"%" + filter.search.trim() + "%"}`);
    }
    if (filter.category !== undefined && filter.category.trim() !== "") {
      conditions.push(Prisma.sql`p.category = ${filter.category.trim()}`);
    }
    if (filter.brand !== undefined && filter.brand.trim() !== "") {
      conditions.push(Prisma.sql`p.brand = ${filter.brand.trim()}`);
    }
    if (filter.hideZero === true) {
      conditions.push(Prisma.sql`i.quantity > 0`);
    }
    if (filter.minPrice !== undefined && filter.minPrice >= 0) {
      conditions.push(Prisma.sql`pv.price >= ${filter.minPrice}`);
    }
    if (filter.maxPrice !== undefined && filter.maxPrice >= 0) {
      conditions.push(Prisma.sql`pv.price <= ${filter.maxPrice}`);
    }
    const whereClause = Prisma.join(conditions, " AND ");
    const offset = (pagination.page - 1) * pagination.pageSize;

    type RawRow = {
      id: number;
      company_id: number;
      branch_id: number;
      product_variant_id: number;
      quantity: number;
      min_stock: number | null;
      created_at: Date;
      updated_at: Date;
      b_id: number;
      b_name: string;
      b_code: string;
      pv_id: number;
      size: string;
      color: string;
      sku: string;
      barcode: string | null;
      price: unknown;
      p_id: number;
      p_name: string;
      p_category: string | null;
      p_brand: string | null;
    };

    const [dataRows, countResult] = await Promise.all([
      prisma.$queryRaw<RawRow[]>`
        SELECT i.id, i.company_id, i.branch_id, i.product_variant_id, i.quantity, i.min_stock, i.created_at, i.updated_at,
          b.id as b_id, b.name as b_name, b.code as b_code,
          pv.id as pv_id, pv.size, pv.color, pv.sku, pv.barcode, pv.price,
          p.id as p_id, p.name as p_name, p.category as p_category, p.brand as p_brand
        FROM inventory i
        INNER JOIN branches b ON b.id = i.branch_id
        INNER JOIN product_variants pv ON pv.id = i.product_variant_id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE ${whereClause}
        ORDER BY i.branch_id, i.product_variant_id
        LIMIT ${pagination.pageSize} OFFSET ${offset}
      `,
      prisma.$queryRaw<[{ count: number | bigint }]>`
        SELECT COUNT(*) as count
        FROM inventory i
        INNER JOIN product_variants pv ON pv.id = i.product_variant_id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE ${whereClause}
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const data = dataRows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      branchId: r.branch_id,
      productVariantId: r.product_variant_id,
      quantity: r.quantity,
      minStock: r.min_stock,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      branch: { id: r.b_id, name: r.b_name, code: r.b_code },
      variant: {
        id: r.pv_id,
        size: r.size,
        color: r.color,
        sku: r.sku,
        barcode: r.barcode,
        price: r.price,
        product: {
          id: r.p_id,
          name: r.p_name,
          category: r.p_category,
          brand: r.p_brand,
        },
      },
    }));

    return {
      data: data as InventoryListResult["data"],
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async adjust(input: AdjustInventoryInput) {
    const { companyId, branchId, productVariantId, quantityDelta, userId } = input;

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

      const before = existing?.quantity ?? 0;
      const newQuantity = before + quantityDelta;

      if (newQuantity < 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const updated = !existing
        ? await tx.inventory.create({
            data: {
              companyId,
              branchId,
              productVariantId,
              quantity: newQuantity,
            },
          })
        : await tx.inventory.update({
            where: { id: existing.id },
            data: { quantity: newQuantity },
          });

      await tx.inventoryMovement.create({
        data: {
          companyId,
          branchId,
          productVariantId,
          type: InventoryMovementType.MANUAL_ADJUST,
          quantityBefore: before,
          quantityAfter: newQuantity,
          userId: userId ?? undefined,
        },
      });

      return updated;
    });
  }

  async setQuantity(input: {
    companyId: number;
    branchId: number;
    productVariantId: number;
    quantity: number;
    minStock?: number | null;
    location?: string | null;
    userId?: number;
  }) {
    const { companyId, branchId, productVariantId, quantity, minStock, location, userId } = input;
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
      const before = existing?.quantity ?? 0;
      const data: { quantity: number; minStock?: number | null; location?: string | null } = { quantity };
      if (minStock !== undefined) data.minStock = minStock === null ? null : minStock;
      if (location !== undefined) data.location = location === null ? null : location;
      const updated = !existing
        ? await tx.inventory.create({
            data: {
              companyId,
              branchId,
              productVariantId,
              quantity,
              ...(data.minStock !== undefined && { minStock: data.minStock }),
              ...(data.location !== undefined && { location: data.location }),
            },
          })
        : await tx.inventory.update({
            where: { id: existing.id },
            data,
          });

      if (before !== quantity) {
        await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId,
            productVariantId,
            type: InventoryMovementType.SET_QUANTITY,
            quantityBefore: before,
            quantityAfter: quantity,
            userId: userId ?? undefined,
          },
        });
      }

      return updated;
    });
  }

  async bulkAdjust(input: {
    companyId: number;
    branchId: number;
    reason: string;
    adjustments: Array<{ variantId: number; newQty: number }>;
    userId?: number;
  }) {
    const { companyId, branchId, reason, adjustments, userId } = input;

    return prisma.$transaction(async (tx) => {
      const results = [];
      for (const adj of adjustments) {
        const existing = await tx.inventory.findUnique({
          where: {
            companyId_branchId_productVariantId: {
              companyId,
              branchId,
              productVariantId: adj.variantId,
            },
          },
        });

        const before = existing?.quantity ?? 0;
        const newQty = adj.newQty;

        const updated = !existing
          ? await tx.inventory.create({
              data: { companyId, branchId, productVariantId: adj.variantId, quantity: newQty },
            })
          : await tx.inventory.update({
              where: { id: existing.id },
              data: { quantity: newQty },
            });

        await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId,
            productVariantId: adj.variantId,
            type: InventoryMovementType.MANUAL_ADJUST,
            quantityBefore: before,
            quantityAfter: newQty,
            userId: userId ?? undefined,
            referenceType: "BULK_ADJUST",
          },
        });

        results.push({ variantId: adj.variantId, before, after: newQty, diff: newQty - before });
      }
      return { branchId, reason, count: results.length, results };
    });
  }

  async listMovements(
    companyId: number,
    filter: {
      branchId?: number;
      productVariantId?: number;
      from?: string;
      to?: string;
    } = {},
    pagination: { page: number; pageSize: number } = { page: 1, pageSize: 25 }
  ) {
    const where: Prisma.InventoryMovementWhereInput = { companyId };
    if (filter.branchId != null) where.branchId = filter.branchId;
    if (filter.productVariantId != null) where.productVariantId = filter.productVariantId;
    if (filter.from || filter.to) {
      where.createdAt = {};
      if (filter.from) where.createdAt.gte = new Date(filter.from + "T00:00:00.000Z");
      if (filter.to) where.createdAt.lte = new Date(filter.to + "T23:59:59.999Z");
    }

    const [data, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          variant: {
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              product: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return { data, total, page: pagination.page, pageSize: pagination.pageSize };
  }
}

