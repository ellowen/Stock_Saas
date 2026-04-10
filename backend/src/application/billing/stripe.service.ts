// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeLib = require("stripe");
import { prisma } from "../../config/database/prisma";
import { PLANS, PlanKey } from "./plan-limits";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StripeInstance = any;

function getStripe(): StripeInstance {
  return new StripeLib(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2026-03-25.dahlia",
  });
}

// Price IDs de los productos creados en Stripe Dashboard
// (completar en .env después de crear los precios en Stripe)
const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  PRO: process.env.STRIPE_PRICE_PRO,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
};

/**
 * Crea o recupera el Stripe Customer para la empresa.
 */
async function getOrCreateCustomer(companyId: number, email: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { stripeCustomerId: true, name: true },
  });

  if (company?.stripeCustomerId) return company.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { companyId: String(companyId) },
    name: company?.name,
  });

  await prisma.company.update({
    where: { id: companyId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Crea una Stripe Checkout Session para el plan elegido.
 * Devuelve la URL a la que redirigir al usuario.
 */
export async function createStripeCheckout(
  companyId: number,
  planKey: "PRO" | "ENTERPRISE",
  email: string,
): Promise<string> {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");

  const priceId = STRIPE_PRICE_IDS[planKey];
  if (!priceId) throw new Error("STRIPE_PRICE_NOT_CONFIGURED");

  const stripe = getStripe();
  const customerId = await getOrCreateCustomer(companyId, email);
  const appUrl = process.env.APP_URL ?? "https://localhost:5173";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/app/plan?stripe_status=success`,
    cancel_url: `${appUrl}/app/plan?stripe_status=cancel`,
    metadata: { companyId: String(companyId), plan: planKey },
    subscription_data: {
      metadata: { companyId: String(companyId), plan: planKey },
    },
    allow_promotion_codes: true,
  });

  return session.url!;
}

/**
 * Crea una sesión del Stripe Customer Portal para gestionar la suscripción.
 */
export async function createStripePortalSession(companyId: number): Promise<string> {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { stripeCustomerId: true },
  });
  if (!company?.stripeCustomerId) throw new Error("NO_STRIPE_CUSTOMER");

  const stripe = getStripe();
  const appUrl = process.env.APP_URL ?? "https://localhost:5173";

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${appUrl}/app/plan`,
  });

  return session.url;
}

/**
 * Procesa los eventos del webhook de Stripe.
 */
export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  if (!process.env.STRIPE_SECRET_KEY) return;

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new Error("INVALID_STRIPE_SIGNATURE");
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = event.data.object as any;
      const companyId = parseInt(sub.metadata?.companyId ?? "0");
      if (!companyId) break;

      const planKey = (sub.metadata?.plan ?? "FREE") as PlanKey;
      const isActive = sub.status === "active" || sub.status === "trialing";
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;

      await prisma.company.update({
        where: { id: companyId },
        data: {
          plan: isActive ? planKey : "FREE",
          subscriptionStatus: sub.status,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: periodEnd,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = event.data.object as any;
      const companyId = parseInt(sub.metadata?.companyId ?? "0");
      if (!companyId) break;

      await prisma.company.update({
        where: { id: companyId },
        data: {
          plan: "FREE",
          subscriptionStatus: "cancelled",
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      await prisma.company.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: "past_due" },
      });
      break;
    }
  }
}
