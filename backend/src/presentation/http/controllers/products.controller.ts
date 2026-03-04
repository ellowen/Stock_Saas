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

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  variants: z.array(productVariantSchema).min(1),
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

