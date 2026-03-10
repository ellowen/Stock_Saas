import { Request, Response } from "express";
import { z } from "zod";
import { AnalyticsService } from "../../../application/analytics/analytics.service";

const topProductsSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const salesByDaySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const overviewSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const reportDetailSchema = z.object({
  from: z.string(),
  to: z.string(),
});

const productsWithoutMovementSchema = z.object({
  days: z.coerce.number().int().min(1).max(365),
  branchId: z.coerce.number().int().positive().optional(),
});

const service = new AnalyticsService();

export const analyticsDashboardController = async (
  req: Request,
  res: Response,
) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const data = await service.dashboard(req.auth.companyId);
    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const analyticsOverviewController = async (
  req: Request,
  res: Response,
) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = overviewSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const options =
      parseResult.data.from && parseResult.data.to
        ? { from: parseResult.data.from, to: parseResult.data.to }
        : undefined;
    const data = await service.overview(req.auth.companyId, options);
    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const analyticsTopProductsController = async (
  req: Request,
  res: Response,
) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = topProductsSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const options =
      parseResult.data.from && parseResult.data.to
        ? { from: parseResult.data.from, to: parseResult.data.to }
        : undefined;
    const data = await service.topProducts(
      req.auth.companyId,
      parseResult.data.limit,
      options,
    );
    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const analyticsSalesByDayController = async (
  req: Request,
  res: Response,
) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = salesByDaySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const options =
      parseResult.data.from && parseResult.data.to
        ? { from: parseResult.data.from, to: parseResult.data.to }
        : undefined;
    const data = await service.salesByDay(
      req.auth.companyId,
      parseResult.data.days ?? 30,
      options,
    );
    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const analyticsReportDetailController = async (
  req: Request,
  res: Response,
) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = reportDetailSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "from y to son obligatorios (YYYY-MM-DD)",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const data = await service.reportDetail(
      req.auth.companyId,
      parseResult.data.from,
      parseResult.data.to,
    );
    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const analyticsProductsWithoutMovementController = async (
  req: Request,
  res: Response,
) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parseResult = productsWithoutMovementSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Parámetro days obligatorio (1–365). branchId opcional.",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const data = await service.productsWithoutMovement(
      req.auth.companyId,
      parseResult.data.days,
      parseResult.data.branchId != null ? { branchId: parseResult.data.branchId } : undefined,
    );
    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};