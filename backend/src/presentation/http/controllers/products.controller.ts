import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ProductService } from "../../../application/products/product.service";

const productVariantSchema = z.object({
  size: z.string().min(1),
  color: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().min(1).optional(),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
});

const productVariantUpdateSchema = productVariantSchema.extend({
  id: z.number().int().positive().optional(),
});

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  variants: z.array(productVariantSchema).min(1),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  variants: z.array(productVariantUpdateSchema).min(1).optional(),
});

const service = new ProductService();

export const createProductController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = createProductSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const product = await service.createProductWithVariants(
      req.auth.companyId,
      parseResult.data,
    );
    return res.status(201).json(product);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "Duplicate value for unique field (probably SKU or barcode)",
          meta: error.meta,
        });
      }
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export const listProductsController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = listQuerySchema.safeParse(req.query);
  const query = parsed.success ? parsed.data : {};

  try {
    if (query.page !== undefined) {
      const result = await service.listProductsPaginated(req.auth.companyId, {
        page: query.page,
        pageSize: query.pageSize ?? 15,
        search: query.search,
        category: query.category,
        brand: query.brand,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
      });
      return res.json(result);
    }
    const products = await service.listProducts(req.auth.companyId);
    return res.json(products);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const listCategoriesController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const categories = await service.getCategories(req.auth.companyId);
    return res.json(categories);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const listBrandsController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const brands = await service.getBrands(req.auth.companyId);
    return res.json(brands);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const updateProductController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ message: "Invalid product ID" });
  }
  const parseResult = updateProductSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.flatten(),
    });
  }
  try {
    const data = parseResult.data;
    const payload: Parameters<ProductService["updateProduct"]>[2] = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description ?? undefined;
    if (data.category !== undefined) payload.category = data.category ?? undefined;
    if (data.brand !== undefined) payload.brand = data.brand ?? undefined;
    if (data.variants !== undefined) {
      payload.variants = data.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        costPrice: v.costPrice,
      }));
    }
    const product = await service.updateProduct(req.auth.companyId, productId, payload);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json(product);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate value for unique field (probably SKU or barcode)" });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const deleteProductController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ message: "Invalid product ID" });
  }
  try {
    const deleted = await service.deleteProduct(req.auth.companyId, productId);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(204).send();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

