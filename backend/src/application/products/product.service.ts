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
      where: { companyId },
      include: {
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listProductsPaginated(
    companyId: number,
    options: { page?: number; pageSize?: number; search?: string; category?: string } = {}
  ) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 15));
    const where: Prisma.ProductWhereInput = { companyId };

    if (options.search?.trim()) {
      where.name = { contains: options.search.trim() };
    }
    if (options.category?.trim()) {
      where.category = { equals: options.category.trim() };
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { variants: true },
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
      where: { companyId },
      select: { category: true },
      distinct: ["category"],
    });
    return rows
      .map((r) => r.category)
      .filter((c): c is string => c != null && c.trim() !== "")
      .sort((a, b) => a.localeCompare(b));
  }
}

