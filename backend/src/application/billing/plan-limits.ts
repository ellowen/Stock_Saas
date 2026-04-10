import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database/prisma";

// ─── Plan definitions ─────────────────────────────────────────────────────────

export const PLANS = {
  FREE: {
    name: "Free",
    priceArs: 0,
    branches: 1,
    users: 5,
    products: 1000,
    monthlySales: 100,
  },
  PRO: {
    name: "Pro",
    priceArs: 100_000,
    branches: 5,
    users: Infinity,
    products: Infinity,
    monthlySales: Infinity,
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceArs: 200_000,
    branches: Infinity,
    users: Infinity,
    products: Infinity,
    monthlySales: Infinity,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getCompanyPlan(companyId: number): Promise<PlanKey> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  });
  const plan = company?.plan ?? "FREE";
  return (plan in PLANS ? plan : "FREE") as PlanKey;
}

// ─── Limit checkers (middleware) ──────────────────────────────────────────────

export async function checkBranchLimit(req: Request, res: Response, next: NextFunction) {
  const companyId = req.auth!.companyId;
  const plan = await getCompanyPlan(companyId);
  const limit = PLANS[plan].branches;
  if (limit === Infinity) return next();

  const count = await prisma.branch.count({ where: { companyId } });
  if (count >= limit) {
    return res.status(402).json({
      code: "PLAN_LIMIT_REACHED",
      resource: "branches",
      limit,
      current: count,
      message: `Tu plan ${PLANS[plan].name} permite máximo ${limit} sucursal(es). Actualizá para agregar más.`,
    });
  }
  next();
}

export async function checkUserLimit(req: Request, res: Response, next: NextFunction) {
  const companyId = req.auth!.companyId;
  const plan = await getCompanyPlan(companyId);
  const limit = PLANS[plan].users;
  if (limit === Infinity) return next();

  const count = await prisma.user.count({ where: { companyId, isActive: true } });
  if (count >= limit) {
    return res.status(402).json({
      code: "PLAN_LIMIT_REACHED",
      resource: "users",
      limit,
      current: count,
      message: `Tu plan ${PLANS[plan].name} permite máximo ${limit} usuario(s) activo(s). Actualizá para agregar más.`,
    });
  }
  next();
}

export async function checkProductLimit(req: Request, res: Response, next: NextFunction) {
  const companyId = req.auth!.companyId;
  const plan = await getCompanyPlan(companyId);
  const limit = PLANS[plan].products;
  if (limit === Infinity) return next();

  const count = await prisma.product.count({ where: { companyId, isActive: true } });
  if (count >= limit) {
    return res.status(402).json({
      code: "PLAN_LIMIT_REACHED",
      resource: "products",
      limit,
      current: count,
      message: `Tu plan ${PLANS[plan].name} permite máximo ${limit} producto(s). Actualizá para agregar más.`,
    });
  }
  next();
}

export async function checkSaleLimit(req: Request, res: Response, next: NextFunction) {
  const companyId = req.auth!.companyId;
  const plan = await getCompanyPlan(companyId);
  const limit = PLANS[plan].monthlySales;
  if (limit === Infinity) return next();

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await prisma.sale.count({
    where: { companyId, createdAt: { gte: firstOfMonth } },
  });
  if (count >= limit) {
    return res.status(402).json({
      code: "PLAN_LIMIT_REACHED",
      resource: "monthlySales",
      limit,
      current: count,
      message: `Alcanzaste el límite de ${limit} ventas este mes en el plan ${PLANS[plan].name}. Actualizá para continuar vendiendo.`,
    });
  }
  next();
}

// ─── Usage info (for PlanPage) ────────────────────────────────────────────────

export async function getPlanUsage(companyId: number) {
  const plan = await getCompanyPlan(companyId);
  const limits = PLANS[plan];

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [branches, users, products, monthlySales] = await Promise.all([
    prisma.branch.count({ where: { companyId } }),
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.product.count({ where: { companyId, isActive: true } }),
    prisma.sale.count({ where: { companyId, createdAt: { gte: firstOfMonth } } }),
  ]);

  return {
    plan,
    usage: { branches, users, products, monthlySales },
    limits: {
      branches: limits.branches === Infinity ? null : limits.branches,
      users: limits.users === Infinity ? null : limits.users,
      products: limits.products === Infinity ? null : limits.products,
      monthlySales: limits.monthlySales === Infinity ? null : limits.monthlySales,
    },
  };
}
