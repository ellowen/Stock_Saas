import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  adjustInventoryController,
  listInventoryController,
  listMovementsController,
  setQuantityController,
} from "../../../presentation/http/controllers/inventory.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listInventoryController);
router.get("/movements", listMovementsController);
router.post("/adjust", adjustInventoryController);
router.patch("/quantity", setQuantityController);

export const inventoryRouter = router;

