import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createProductController,
  listCategoriesController,
  listProductsController,
} from "../../../presentation/http/controllers/products.controller";

const router = Router();

router.use(authMiddleware);

router.get("/categories", listCategoriesController);
router.get("/", listProductsController);
router.post("/", createProductController);

export const productsRouter = router;

