import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
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
router.post("/import-csv", uploadMiddleware, importCsvController);
router.get("/brands", listBrandsController);
router.get("/", listProductsController);
router.post("/", checkProductLimit, createProductController);
router.patch("/:id", updateProductController);
router.delete("/:id", deleteProductController);

export const productsRouter = router;

