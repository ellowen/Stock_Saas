import express, { Application } from "express";
import cors from "cors";
import { json, urlencoded } from "express";
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

export const createApp = (): Application => {
  const app = express();

  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));

  app.use("/auth", authRouter);
  app.use("/protected", protectedRouter);
  app.use("/products", productsRouter);
  app.use("/inventory", inventoryRouter);
  app.use("/sales", salesRouter);
  app.use("/stock-transfers", stockTransferRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/branches", branchesRouter);
  app.use("/users", usersRouter);

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

