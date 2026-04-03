import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
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
router.post("/bulk-adjust", bulkAdjustController);
router.post("/adjust", adjustInventoryController);
router.patch("/quantity", setQuantityController);

export const inventoryRouter = router;

