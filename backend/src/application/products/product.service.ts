import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

export interface CreateProductVariantInput {
  size: string;
  color: string;
  sku: string;
  barcode?: string;
  price: number;
  costPrice?: number;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  variants: CreateProductVariantInput[];
}

export class ProductService {
  async createProductWithVariants(
    companyId: number,
    data: CreateProductInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          companyId,
          name: data.name,
          description: data.description,
          category: data.category,
          brand: data.brand,
        },
      });

      const variantsData: Prisma.ProductVariantCreateManyInput[] =
        data.variants.map((variant) => ({
          companyId,
          productId: product.id,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          barcode: variant.barcode,
          price: new Prisma.Decimal(variant.price),
          costPrice:
            variant.costPrice !== undefined
              ? new Prisma.Decimal(variant.costPrice)
              : undefined,
        }));

      await tx.productVariant.createMany({
        data: variantsData,
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: true },
      });
    });
  }

  async listProducts(companyId: number) {
    return prisma.product.findMany({
      where: { companyId, isActive: true },
      include: {
        variants: { where: { isActive: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listProductsPaginated(
    companyId: number,
    options: { page?: number; pageSize?: number; search?: string; category?: string; brand?: string; minPrice?: number; maxPrice?: number } = {}
  ) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 15));
    const where: Prisma.ProductWhereInput = { companyId, isActive: true };

    if (options.search?.trim()) {
      where.name = { contains: options.search.trim(), mode: "insensitive" };
    }
    if (options.category?.trim()) {
      where.category = { equals: options.category.trim() };
    }
    if (options.brand?.trim()) {
      where.brand = { equals: options.brand.trim() };
    }
    const priceCond: { gte?: number; lte?: number } = {};
    if (options.minPrice !== undefined && options.minPrice >= 0) priceCond.gte = options.minPrice;
    if (options.maxPrice !== undefined && options.maxPrice >= 0) priceCond.lte = options.maxPrice;
    if (Object.keys(priceCond).length > 0) {
      where.variants = { some: { price: priceCond, isActive: true } };
    } else {
      where.variants = { some: { isActive: true } };
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { variants: { where: { isActive: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async getCategories(companyId: number): Promise<string[]> {
    const rows = await prisma.product.findMany({
      where: { companyId, isActive: true },
      select: { category: true },
      distinct: ["category"],
    });
    return rows
      .map((r) => r.category)
      .filter((c): c is string => c != null && c.trim() !== "")
      .sort((a, b) => a.localeCompare(b));
  }

  async getBrands(companyId: number): Promise<string[]> {
    const rows = await prisma.product.findMany({
      where: { companyId, isActive: true },
      select: { brand: true },
      distinct: ["brand"],
    });
    return rows
      .map((r) => r.brand)
      .filter((b): b is string => b != null && b.trim() !== "")
      .sort((a, b) => a.localeCompare(b));
  }

  async updateProduct(
    companyId: number,
    productId: number,
    data: { name?: string; description?: string; category?: string; brand?: string; variants?: Array<{ id?: number; size: string; color: string; sku: string; barcode?: string; price: number; costPrice?: number }> }
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId, isActive: true },
      include: { variants: { where: { isActive: true } } },
    });
    if (!product) return null;

    return prisma.$transaction(async (tx) => {
      const updateData: { name?: string; description?: string; category?: string; brand?: string } = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.brand !== undefined) updateData.brand = data.brand;
      if (Object.keys(updateData).length > 0) {
        await tx.product.update({
          where: { id: productId },
          data: updateData,
        });
      }

      if (data.variants && data.variants.length > 0) {
        const existingIds = new Set(product.variants.map((v) => v.id));
        const bodyIds = new Set((data.variants.map((v) => (v as { id?: number }).id).filter((id): id is number => id != null)) as Set<number>;
        for (const v of product.variants) {
          if (!bodyIds.has(v.id)) {
            await tx.productVariant.update({ where: { id: v.id }, data: { isActive: false } });
          }
        }
        for (const v of data.variants) {
          const variantPayload = v as { id?: number; size: string; color: string; sku: string; barcode?: string; price: number; costPrice?: number };
          if (variantPayload.id != null && existingIds.has(variantPayload.id)) {
            await tx.productVariant.update({
              where: { id: variantPayload.id },
              data: {
                size: variantPayload.size,
                color: variantPayload.color,
                sku: variantPayload.sku,
                barcode: variantPayload.barcode ?? null,
                price: new Prisma.Decimal(variantPayload.price),
                costPrice: variantPayload.costPrice !== undefined ? new Prisma.Decimal(variantPayload.costPrice) : null,
              },
            });
          } else if (variantPayload.id == null) {
            await tx.productVariant.create({
              data: {
                companyId,
                productId,
                size: variantPayload.size,
                color: variantPayload.color,
                sku: variantPayload.sku,
                barcode: variantPayload.barcode,
                price: new Prisma.Decimal(variantPayload.price),
                costPrice: variantPayload.costPrice !== undefined ? new Prisma.Decimal(variantPayload.costPrice) : undefined,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: productId },
        include: { variants: { where: { isActive: true } } },
      });
    });
  }

  async deleteProduct(companyId: number, productId: number): Promise<boolean> {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId, isActive: true },
      include: { variants: true },
    });
    if (!product) return false;

    await prisma.$transaction(async (tx) => {
      await tx.productVariant.updateMany({
        where: { productId, companyId },
        data: { isActive: false },
      });
      await tx.product.update({
        where: { id: productId },
        data: { isActive: false },
      });
    });
    return true;
  }
}

