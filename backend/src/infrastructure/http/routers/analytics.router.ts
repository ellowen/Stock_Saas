import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { prisma } from "../../../config/database/prisma";
import { StockForecastService } from "../../../application/analytics/stock-forecast.service";
import type { Urgency } from "../../../application/analytics/stock-forecast.service";
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

// Global search — all authenticated users
router.get("/search", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const q = String(req.query["q"] ?? "").trim();
  if (q.length < 2) return res.json({ products: [], customers: [], sales: [] });

  const limit = 6;
  const like = { contains: q };

  const [products, customers, sales] = await Promise.all([
    prisma.product.findMany({
      where: {
        companyId,
        OR: [{ name: { contains: q } }, { category: { contains: q } }, { brand: { contains: q } }],
      },
      take: limit,
      select: { id: true, name: true, category: true, brand: true },
    }),
    prisma.customer.findMany({
      where: {
        companyId,
        OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }],
      },
      take: limit,
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.sale.findMany({
      where: {
        companyId,
        OR: [
          { customer: { name: { contains: q } } },
          { id: isNaN(Number(q)) ? undefined : Number(q) },
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, totalAmount: true, createdAt: true, customer: { select: { name: true } } },
    }),
  ]);

  return res.json({ products, customers, sales });
});

// ─── In-app alerts summary ────────────────────────────────────────────────────
// GET /analytics/alerts — returns consolidated alert counts for notification bell
router.get("/alerts", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [lowStockRows, pendingPayrolls, expiringBatches, overdueReceivables] = await Promise.all([
    // Low stock
    prisma.inventory.findMany({ where: { companyId }, select: { quantity: true, minStock: true } }),
    // Payrolls confirmed but not paid
    prisma.payroll.count({ where: { companyId, status: "CONFIRMED" } }),
    // Batches expiring in <=7 days
    prisma.batch.count({
      where: {
        companyId,
        expiresAt: { not: null, lte: new Date(Date.now() + 7 * 86400000) },
        quantity: { gt: 0 },
      },
    }).catch(() => 0),
    // Overdue account receivables (dueDate < today, status != PAID)
    prisma.accountReceivable.count({
      where: {
        companyId,
        status: { not: "PAID" },
        dueDate: { lt: new Date(todayStr) },
      },
    }).catch(() => 0),
  ]);

  const lowStock = lowStockRows.filter(
    (r) => (r.minStock != null && r.quantity <= r.minStock) || (r.minStock == null && r.quantity < 5)
  ).length;

  const alerts = [];
  if (lowStock > 0) alerts.push({ type: "low_stock", count: lowStock, label: `${lowStock} producto${lowStock !== 1 ? "s" : ""} con stock bajo`, link: "/app/inventory" });
  if (pendingPayrolls > 0) alerts.push({ type: "payroll", count: pendingPayrolls, label: `${pendingPayrolls} sueldo${pendingPayrolls !== 1 ? "s" : ""} pendiente${pendingPayrolls !== 1 ? "s" : ""} de pago`, link: "/app/payroll" });
  if (expiringBatches > 0) alerts.push({ type: "expiry", count: expiringBatches, label: `${expiringBatches} lote${expiringBatches !== 1 ? "s" : ""} por vencer`, link: "/app/inventory" });
  if (overdueReceivables > 0) alerts.push({ type: "receivable", count: overdueReceivables, label: `${overdueReceivables} cuenta${overdueReceivables !== 1 ? "s" : ""} por cobrar vencida${overdueReceivables !== 1 ? "s" : ""}`, link: "/app/accounts" });

  return res.json({ total: alerts.reduce((s, a) => s + a.count, 0), alerts });
});

// ─── Stock Forecast & Reorder Suggestions ────────────────────────────────────
const forecastService = new StockForecastService();

// GET /analytics/reorder-suggestions?branchId=&urgency=&days=
router.get("/reorder-suggestions", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
  const urgency = req.query["urgency"] as Urgency | undefined;
  const days = req.query["days"] ? Number(req.query["days"]) : undefined;
  try {
    const rows = await forecastService.getReorderSuggestions(companyId, { branchId, urgency, days });
    return res.json(rows);
  } catch (err) {
    console.error("[reorder-suggestions]", err);
    return res.status(500).json({ message: "Error al calcular sugerencias" });
  }
});

// POST /analytics/reorder-suggestions/create-po
// Body: { branchId, lines: [{ variantId, qty, supplierId, description, unitPrice }] }
router.post("/reorder-suggestions/create-po", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const userId = req.auth!.userId;
  const { branchId, lines } = req.body;
  if (!branchId || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ message: "branchId y lines son requeridos" });
  }
  try {
    const created = await forecastService.createSuggestedPurchaseOrders(companyId, userId, Number(branchId), lines);
    return res.json(created);
  } catch (err) {
    console.error("[create-po]", err);
    return res.status(500).json({ message: "Error al crear orden de compra" });
  }
});

// Reportes completos: solo OWNER y MANAGER
router.use(requireRole(["OWNER", "MANAGER"]));
router.get("/overview", analyticsOverviewController);
router.get("/report-detail", analyticsReportDetailController);
router.get("/products-without-movement", analyticsProductsWithoutMovementController);
router.get("/top-products", analyticsTopProductsController);
router.get("/sales-by-day", analyticsSalesByDayController);

export const analyticsRouter = router;

