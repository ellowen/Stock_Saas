import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  listHeldSalesController,
  createHeldSaleController,
  resumeHeldSaleController,
  discardHeldSaleController,
} from "../../../presentation/http/controllers/held-sales.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listHeldSalesController);
router.post("/", createHeldSaleController);
router.post("/:id/resume", resumeHeldSaleController);
router.delete("/:id", discardHeldSaleController);

export const heldSalesRouter = router;
