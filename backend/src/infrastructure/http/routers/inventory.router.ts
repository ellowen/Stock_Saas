import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import {
  adjustInventoryController,
  bulkAdjustController,
  listInventoryController,
  listMovementsController,
  setQuantityController,
} from "../../../presentation/http/controllers/inventory.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listInventoryController);
router.get("/movements", listMovementsController);
router.post("/bulk-adjust", requirePermission("INVENTORY_WRITE"), bulkAdjustController);
router.post("/adjust", requirePermission("INVENTORY_WRITE"), adjustInventoryController);
router.patch("/quantity", requirePermission("INVENTORY_WRITE"), setQuantityController);

export const inventoryRouter = router;

