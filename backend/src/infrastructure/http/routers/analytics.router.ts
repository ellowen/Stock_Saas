import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  analyticsDashboardController,
  analyticsOverviewController,
  analyticsReportDetailController,
  analyticsSalesByDayController,
  analyticsTopProductsController,
} from "../../../presentation/http/controllers/analytics.controller";

const router = Router();

router.use(authMiddleware);

router.get("/dashboard", analyticsDashboardController);
router.get("/overview", analyticsOverviewController);
router.get("/report-detail", analyticsReportDetailController);
router.get("/top-products", analyticsTopProductsController);
router.get("/sales-by-day", analyticsSalesByDayController);

export const analyticsRouter = router;

