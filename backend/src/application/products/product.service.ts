import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

export interface VariantAttributeInput {
  attributeId: number;
  value: string;
}

export interface CreateProductVariantInput {
  sku: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  attributes?: VariantAttributeInput[];
}

export interface CreateProductInput {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  variants: CreateProductVariantInput[];
}

const variantInclude = {
  attributes: {
    include: { attribute: true },
    orderBy: { attribute: { sortOrder: "asc" as const } },
  },
};

function parseVariantAttributes(variant: any) {
  return {
    ...variant,
    attributes: (variant.attributes ?? []).map((va: any) => ({
      id: va.attribute.id,
      name: va.attribute.name,
      type: va.attribute.type,
      value: va.value,
    })),
  };
}

export class ProductService {
  async createProductWithVariants(companyId: number, data: CreateProductInput) {
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

      for (const variant of data.variants) {
        const created = await tx.productVariant.create({
          data: {
            companyId,
            productId: product.id,
            sku: variant.sku,
            barcode: variant.barcode,
            price: new Prisma.Decimal(variant.price),
            costPrice:
              variant.costPrice !== undefined
                ? new Prisma.Decimal(variant.costPrice)
                : undefined,
          },
        });

        if (variant.attributes?.length) {
          await tx.productVariantAttribute.createMany({
            data: variant.attributes.map((a) => ({
              variantId: created.id,
              attributeId: a.attributeId,
              value: a.value,
            })),
          });
        }
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: { where: { isActive: true }, include: variantInclude } },
      });
    });
  }

  async listProducts(companyId: number) {
    const products = await prisma.product.findMany({
      where: { companyId, isActive: true },
      include: {
        variants: {
          where: { isActive: true },
          include: variantInclude,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return products.map((p) => ({
      ...p,
      variants: p.variants.map(parseVariantAttributes),
    }));
  }

  async listProductsPaginated(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
    } = {}
  ) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 15));
    const where: Prisma.ProductWhereInput = { companyId, isActive: true };

    if (options.search?.trim()) {
      where.name = { contains: options.search.trim() };
    }
    if (options.category?.trim()) {
      where.category = { equals: options.category.trim() };
    }
    if (options.brand?.trim()) {
      where.brand = { equals: options.brand.trim() };
    }
    const priceCond: { gte?: number; lte?: number } = {};
    if (options.minPrice !== undefined && options.minPrice >= 0)
      priceCond.gte = options.minPrice;
    if (options.maxPrice !== undefined && options.maxPrice >= 0)
      priceCond.lte = options.maxPrice;
    if (Object.keys(priceCond).length > 0) {
      where.variants = { some: { price: priceCond, isActive: true } };
    } else {
      where.variants = { some: { isActive: true } };
    }

    const [rawData, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: {
            where: { isActive: true },
            include: variantInclude,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    const data = rawData.map((p) => ({
      ...p,
      variants: p.variants.map(parseVariantAttributes),
    }));

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
    data: {
      name?: string;
      description?: string;
      category?: string;
      brand?: string;
      variants?: Array<{
        id?: number;
        sku: string;
        barcode?: string;
        price: number;
        costPrice?: number;
        attributes?: VariantAttributeInput[];
      }>;
    }
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId, isActive: true },
      include: { variants: { where: { isActive: true } } },
    });
    if (!product) return null;

    return prisma.$transaction(async (tx) => {
      const updateData: Prisma.ProductUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.brand !== undefined) updateData.brand = data.brand;
      if (Object.keys(updateData).length > 0) {
        await tx.product.update({ where: { id: productId }, data: updateData });
      }

      if (data.variants && data.variants.length > 0) {
        const existingIds = new Set(product.variants.map((v) => v.id));
        const bodyIds = new Set(
          data.variants
            .map((v) => v.id)
            .filter((id): id is number => id != null)
        );

        // Soft-delete variantes que ya no están en el body
        for (const v of product.variants) {
          if (!bodyIds.has(v.id)) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: { isActive: false },
            });
          }
        }

        for (const v of data.variants) {
          if (v.id != null && existingIds.has(v.id)) {
            // Actualizar existente
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku: v.sku,
                barcode: v.barcode ?? null,
                price: new Prisma.Decimal(v.price),
                costPrice:
                  v.costPrice !== undefined
                    ? new Prisma.Decimal(v.costPrice)
                    : null,
              },
            });
            // Reemplazar atributos
            if (v.attributes !== undefined) {
              await tx.productVariantAttribute.deleteMany({
                where: { variantId: v.id },
              });
              if (v.attributes.length > 0) {
                await tx.productVariantAttribute.createMany({
                  data: v.attributes.map((a) => ({
                    variantId: v.id!,
                    attributeId: a.attributeId,
                    value: a.value,
                  })),
                });
              }
            }
          } else if (v.id == null) {
            // Crear nueva variante
            const created = await tx.productVariant.create({
              data: {
                companyId,
                productId,
                sku: v.sku,
                barcode: v.barcode,
                price: new Prisma.Decimal(v.price),
                costPrice:
                  v.costPrice !== undefined
                    ? new Prisma.Decimal(v.costPrice)
                    : undefined,
              },
            });
            if (v.attributes?.length) {
              await tx.productVariantAttribute.createMany({
                data: v.attributes.map((a) => ({
                  variantId: created.id,
                  attributeId: a.attributeId,
                  value: a.value,
                })),
              });
            }
          }
        }
      }

      const updated = await tx.product.findUnique({
        where: { id: productId },
        include: {
          variants: { where: { isActive: true }, include: variantInclude },
        },
      });
      return updated
        ? { ...updated, variants: updated.variants.map(parseVariantAttributes) }
        : null;
    });
  }

  async deleteProduct(companyId: number, productId: number): Promise<boolean> {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId, isActive: true },
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
