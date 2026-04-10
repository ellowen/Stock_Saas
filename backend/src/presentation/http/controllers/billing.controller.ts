import { Request, Response } from "express";
import { getPlanUsage } from "../../../application/billing/plan-limits";
import { createMPSubscriptionLink, cancelMPSubscription } from "../../../application/billing/mp.service";
import { createStripeCheckout, createStripePortalSession, handleStripeWebhook } from "../../../application/billing/stripe.service";
import { handleMPWebhook } from "../../../application/billing/mp.service";

/** GET /billing/usage — uso actual del plan */
export async function getUsage(req: Request, res: Response) {
  const usage = await getPlanUsage(req.auth!.companyId);
  return res.json(usage);
}

/** POST /billing/subscribe — inicia checkout para un plan */
export async function subscribe(req: Request, res: Response) {
  const { plan, provider } = req.body as { plan: "PRO" | "ENTERPRISE"; provider: "mp" | "stripe" };

  if (!["PRO", "ENTERPRISE"].includes(plan)) {
    return res.status(400).json({ message: "Plan inválido" });
  }
  if (!["mp", "stripe"].includes(provider ?? "")) {
    return res.status(400).json({ message: "Provider inválido. Usar 'mp' o 'stripe'" });
  }

  // Obtener email del OWNER de la empresa
  const { prisma } = await import("../../../config/database/prisma");
  const owner = await prisma.user.findFirst({
    where: { companyId: req.auth!.companyId, role: "OWNER" },
    select: { email: true },
  });
  const email = owner?.email ?? `company-${req.auth!.companyId}@giro.app`;

  try {
    let url: string;
    if (provider === "mp") {
      url = await createMPSubscriptionLink(req.auth!.companyId, plan, email);
    } else {
      url = await createStripeCheckout(req.auth!.companyId, plan, email);
    }
    return res.json({ url });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "MP_NOT_CONFIGURED" || err.message === "STRIPE_NOT_CONFIGURED") {
        return res.status(503).json({ code: "NOT_CONFIGURED", message: "El procesador de pagos no está configurado aún. Contactá al administrador." });
      }
      if (err.message === "MP_PLAN_NOT_CREATED") {
        return res.status(503).json({ code: "NOT_CONFIGURED", message: "Los planes de MercadoPago no están creados aún." });
      }
      if (err.message === "STRIPE_PRICE_NOT_CONFIGURED") {
        return res.status(503).json({ code: "NOT_CONFIGURED", message: "Los precios de Stripe no están configurados aún." });
      }
    }
    throw err;
  }
}

/** POST /billing/cancel — cancela la suscripción activa */
export async function cancelSubscription(req: Request, res: Response) {
  if (req.auth!.role !== "OWNER") {
    return res.status(403).json({ message: "Solo el dueño puede cancelar la suscripción" });
  }
  await cancelMPSubscription(req.auth!.companyId);
  return res.json({ ok: true });
}

/** GET /billing/portal — portal de Stripe para gestionar suscripción */
export async function stripePortal(req: Request, res: Response) {
  try {
    const url = await createStripePortalSession(req.auth!.companyId);
    return res.json({ url });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NO_STRIPE_CUSTOMER") {
        return res.status(400).json({ message: "No hay suscripción activa de Stripe" });
      }
      if (err.message === "STRIPE_NOT_CONFIGURED") {
        return res.status(503).json({ code: "NOT_CONFIGURED", message: "Stripe no está configurado" });
      }
    }
    throw err;
  }
}

/** POST /billing/webhook/mp — webhook de MercadoPago */
export async function mpWebhook(req: Request, res: Response) {
  try {
    await handleMPWebhook(req.body);
    return res.sendStatus(200);
  } catch {
    return res.sendStatus(500);
  }
}

/** POST /billing/webhook/stripe — webhook de Stripe (raw body) */
export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  try {
    await handleStripeWebhook(req.body as Buffer, sig);
    return res.sendStatus(200);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STRIPE_SIGNATURE") {
      return res.status(400).json({ message: "Firma inválida" });
    }
    return res.sendStatus(500);
  }
}
