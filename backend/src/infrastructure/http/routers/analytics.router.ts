import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import {
  analyticsDashboardController,
  analyticsOverviewController,
  analyticsProductsWithoutMovementController,
  analyticsReportDetailController,
  analyticsSalesByDayController,
  analyticsTopProductsController,
} from "../../../presentation/http/controllers/analytics.controller";

const router = Router();

router.use(authMiddleware);

// Dashboard: todos los roles (resumen del día)
router.get("/dashboard", analyticsDashboardController);

// Reportes completos: solo OWNER y MANAGER
router.use(requireRole(["OWNER", "MANAGER"]));
router.get("/overview", analyticsOverviewController);
router.get("/report-detail", analyticsReportDetailController);
router.get("/products-without-movement", analyticsProductsWithoutMovementController);
router.get("/top-products", analyticsTopProductsController);
router.get("/sales-by-day", analyticsSalesByDayController);

export const analyticsRouter = router;

