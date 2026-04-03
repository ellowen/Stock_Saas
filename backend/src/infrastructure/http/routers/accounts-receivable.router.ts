import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createARController,
  listARController,
  addARPaymentController,
  getARSummaryController,
} from "../../../presentation/http/controllers/accounts-receivable.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listARController);
router.post("/", createARController);
router.get("/summary", getARSummaryController);
router.post("/:id/pay", addARPaymentController);

export const accountsReceivableRouter = router;
