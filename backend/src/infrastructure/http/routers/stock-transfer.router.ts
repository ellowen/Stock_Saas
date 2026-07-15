import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import {
  cancelTransferController,
  completeTransferController,
  createTransferController,
  listTransfersController,
} from "../../../presentation/http/controllers/stock-transfer.controller";

const router = Router();

router.use(authMiddleware);
router.use(requirePermission("TRANSFERS_APPROVE"));

router.get("/", listTransfersController);
router.post("/", createTransferController);
router.post("/complete", completeTransferController);
router.post("/:id/cancel", cancelTransferController);

export const stockTransferRouter = router;

