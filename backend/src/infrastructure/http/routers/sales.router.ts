import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createSaleController,
  listSalesController,
} from "../../../presentation/http/controllers/sales.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listSalesController);
router.post("/", createSaleController);

export const salesRouter = router;

