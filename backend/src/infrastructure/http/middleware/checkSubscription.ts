import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../config/database/prisma";

const GRACE_ROUTES = [
  "/auth/",
  "/billing/",
  "/push/",
  "/protected/",
  "/health",
];

/**
 * Bloquea el acceso a rutas de negocio si el trial expiró
 * y la empresa no tiene un plan de pago activo.
 */
export async function checkSubscription(req: Request, res: Response, next: NextFunction) {
  // Solo aplica a rutas autenticadas con companyId
  if (!req.auth?.companyId) return next();

  // Rutas de gracia (siempre permitidas)
  const isGrace = GRACE_ROUTES.some((r) => req.path.startsWith(r));
  if (isGrace) return next();

  const company = await prisma.company.findUnique({
    where: { id: req.auth.companyId },
    select: {
      plan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  });
  if (!company) return next();

  // Plan de pago activo → OK
  const activeStatuses = ["active", "trialing"];
  if (company.plan !== "FREE" && activeStatuses.includes(company.subscriptionStatus ?? "")) {
    return next();
  }

  // Trial activo → OK
  if (company.trialEndsAt && new Date(company.trialEndsAt) > new Date()) {
    return next();
  }

  // Plan FREE sin trial → también OK (el plan FREE no tiene fecha de vencimiento,
  // solo tiene límites de uso que se manejan con checkPlanLimits)
  if (company.plan === "FREE") return next();

  // Trial expirado + sin plan activo → bloqueado
  return res.status(402).json({
    code: "SUBSCRIPTION_EXPIRED",
    message: "Tu período de prueba expiró. Elegí un plan para continuar usando GIRO.",
  });
}
