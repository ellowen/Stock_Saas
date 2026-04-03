import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createSaleController,
  listSalesController,
} from "../../../presentation/http/controllers/sales.controller";
import {
  cancelSaleController,
  returnSaleItemsController,
} from "../../../presentation/http/controllers/sale-returns.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listSalesController);
router.post("/", createSaleController);
router.post("/:id/cancel", cancelSaleController);
router.post("/:id/return", returnSaleItemsController);

export const salesRouter = router;

