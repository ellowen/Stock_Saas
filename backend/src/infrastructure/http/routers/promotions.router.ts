import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import {
  listPromotionsController,
  createPromotionController,
  updatePromotionController,
  deletePromotionController,
  previewPromotionsController,
  validateCouponController,
} from "../../../presentation/http/controllers/promotions.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listPromotionsController);
router.post("/preview", previewPromotionsController);
router.post("/coupon", validateCouponController);
router.post("/", requirePermission("PRODUCTS_WRITE"), createPromotionController);
router.put("/:id", requirePermission("PRODUCTS_WRITE"), updatePromotionController);
router.delete("/:id", requirePermission("PRODUCTS_WRITE"), deletePromotionController);

export const promotionsRouter = router;
