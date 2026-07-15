import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import {
  createProductController,
  deleteProductController,
  listBrandsController,
  listCategoriesController,
  listProductsController,
  updateProductController,
} from "../../../presentation/http/controllers/products.controller";
import { importCsvController, uploadMiddleware } from "../../../presentation/http/controllers/csv-import.controller";
import { checkProductLimit } from "../../../application/billing/plan-limits";

const router = Router();

router.use(authMiddleware);

router.get("/categories", listCategoriesController);
router.get("/brands", listBrandsController);
router.get("/", listProductsController);
router.post("/import-csv", requirePermission("PRODUCTS_WRITE"), uploadMiddleware, importCsvController);
router.post("/", requirePermission("PRODUCTS_WRITE"), checkProductLimit, createProductController);
router.patch("/:id", requirePermission("PRODUCTS_WRITE"), updateProductController);
router.delete("/:id", requirePermission("PRODUCTS_DELETE"), deleteProductController);

export const productsRouter = router;

