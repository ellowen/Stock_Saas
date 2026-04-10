import express, { Application } from "express";
import cors from "cors";
import { json, urlencoded } from "express";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { authRouter } from "./infrastructure/http/routers/auth.router";
import { protectedRouter } from "./infrastructure/http/routers/protected.router";
import { productsRouter } from "./infrastructure/http/routers/products.router";
import { inventoryRouter } from "./infrastructure/http/routers/inventory.router";
import { salesRouter } from "./infrastructure/http/routers/sales.router";
import { stockTransferRouter } from "./infrastructure/http/routers/stock-transfer.router";
import { analyticsRouter } from "./infrastructure/http/routers/analytics.router";
import { branchesRouter } from "./infrastructure/http/routers/branches.router";
import { usersRouter } from "./infrastructure/http/routers/users.router";
import { attributesRouter } from "./infrastructure/http/routers/attributes.router";
import { customersRouter } from "./infrastructure/http/routers/customers.router";
import { suppliersRouter } from "./infrastructure/http/routers/suppliers.router";
import { taxConfigsRouter } from "./infrastructure/http/routers/tax-configs.router";
import { documentsRouter } from "./infrastructure/http/routers/documents.router";
import { purchaseOrdersRouter } from "./infrastructure/http/routers/purchase-orders.router";
import { stockCountsRouter } from "./infrastructure/http/routers/stock-counts.router";
import { batchesRouter } from "./infrastructure/http/routers/batches.router";
import { accountsReceivableRouter } from "./infrastructure/http/routers/accounts-receivable.router";
import { employeesRouter } from "./infrastructure/http/routers/employees.router";
import { payrollsRouter } from "./infrastructure/http/routers/payrolls.router";
import { accountsChartRouter } from "./infrastructure/http/routers/accounts-chart.router";
import { journalRouter } from "./infrastructure/http/routers/journal.router";
import { ivaBookRouter } from "./infrastructure/http/routers/iva-book.router";
import { auditRouter } from "./infrastructure/http/routers/audit.router";
import { checkSubscription } from "./infrastructure/http/middleware/checkSubscription";
import { pushRouter } from "./infrastructure/http/routers/push.router";
import { billingRouter } from "./infrastructure/http/routers/billing.router";

export const createApp = (): Application => {
  const app = express();

  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));

  // Rate limit global (desactivado en test para no bloquear tests)
  if (env.nodeEnv !== "test") {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: env.nodeEnv === "production" ? 100 : 500,
        message: { message: "Demasiadas solicitudes. Probá de nuevo en unos minutos." },
        standardHeaders: true,
        legacyHeaders: false,
      })
    );
  }

  app.use(checkSubscription);
  app.use("/auth", authRouter);
  app.use("/protected", protectedRouter);
  app.use("/products", productsRouter);
  app.use("/inventory", inventoryRouter);
  app.use("/sales", salesRouter);
  app.use("/stock-transfers", stockTransferRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/branches", branchesRouter);
  app.use("/users", usersRouter);
  app.use("/attributes", attributesRouter);
  app.use("/customers", customersRouter);
  app.use("/suppliers", suppliersRouter);
  app.use("/tax-configs", taxConfigsRouter);
  app.use("/documents", documentsRouter);
  app.use("/purchase-orders", purchaseOrdersRouter);
  app.use("/stock-counts", stockCountsRouter);
  app.use("/batches", batchesRouter);
  app.use("/accounts-receivable", accountsReceivableRouter);
  app.use("/employees", employeesRouter);
  app.use("/payrolls", payrollsRouter);
  app.use("/accounts-chart", accountsChartRouter);
  app.use("/journal", journalRouter);
  app.use("/iva-book", ivaBookRouter);
  app.use("/audit-logs", auditRouter);
  app.use("/push", pushRouter);
  app.use("/billing", billingRouter);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      env: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  // TODO: aquí montaremos routers (auth, products, etc.)

  return app;
};

