import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createSaleController,
  listSalesController,
  sendReceiptController,
} from "../../../presentation/http/controllers/sales.controller";
import {
  cancelSaleController,
  returnSaleItemsController,
} from "../../../presentation/http/controllers/sale-returns.controller";
import { checkSaleLimit } from "../../../application/billing/plan-limits";

const router = Router();

router.use(authMiddleware);

router.get("/", listSalesController);
router.post("/", checkSaleLimit, createSaleController);
router.post("/:id/cancel", cancelSaleController);
router.post("/:id/return", returnSaleItemsController);
router.post("/:id/send-receipt", sendReceiptController);

export const salesRouter = router;

