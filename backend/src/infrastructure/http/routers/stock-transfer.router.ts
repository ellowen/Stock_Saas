import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  completeTransferController,
  createTransferController,
  listTransfersController,
} from "../../../presentation/http/controllers/stock-transfer.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listTransfersController);
router.post("/", createTransferController);
router.post("/complete", completeTransferController);

export const stockTransferRouter = router;

