import { MercadoPagoConfig, PreApproval, PreApprovalPlan } from "mercadopago";
import { prisma } from "../../config/database/prisma";
import { PLANS, PlanKey } from "./plan-limits";

function getClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN ?? "",
  });
}

// IDs de los planes creados en MP (se completan al crear los planes una sola vez)
const MP_PLAN_IDS: Record<string, string | undefined> = {
  PRO: process.env.MP_PLAN_PRO_ID,
  ENTERPRISE: process.env.MP_PLAN_ENTERPRISE_ID,
};

/**
 * Crea los planes de suscripción en MercadoPago si no existen.
 * Llamar una vez desde un script de setup o al arrancar el servidor en producción.
 */
export async function setupMPPlans() {
  if (!process.env.MP_ACCESS_TOKEN) {
    console.log("[MP] Sin credenciales — omitiendo setup de planes.");
    return;
  }
  const client = getClient();
  const planApi = new PreApprovalPlan(client);

  for (const key of ["PRO", "ENTERPRISE"] as const) {
    if (MP_PLAN_IDS[key]) continue; // ya existe en .env
    const plan = PLANS[key];
    const result = await planApi.create({
      body: {
        reason: `GIRO ${plan.name}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: plan.priceArs,
          currency_id: "ARS",
        },
        back_url: `${process.env.APP_URL ?? "https://localhost:5173"}/app/plan`,
        status: "active",
      },
    });
    console.log(`[MP] Plan ${key} creado: ${result.id} — guardá esto en MP_PLAN_${key}_ID`);
  }
}

/**
 * Genera el link de suscripción de MercadoPago para el plan elegido.
 * El usuario hace click, paga en MP y queda suscripto.
 */
export async function createMPSubscriptionLink(
  companyId: number,
  planKey: "PRO" | "ENTERPRISE",
  payerEmail: string,
): Promise<string> {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error("MP_NOT_CONFIGURED");
  }

  const planId = MP_PLAN_IDS[planKey];
  if (!planId) throw new Error("MP_PLAN_NOT_CREATED");

  const client = getClient();
  const preApproval = new PreApproval(client);

  const result = await preApproval.create({
    body: {
      preapproval_plan_id: planId,
      payer_email: payerEmail,
      back_url: `${process.env.APP_URL ?? "https://localhost:5173"}/app/plan?mp_status=success`,
      status: "pending",
      external_reference: String(companyId),
    },
  });

  return result.init_point!;
}

/**
 * Procesa el webhook de MercadoPago para preapproval (suscripciones).
 */
export async function handleMPWebhook(body: {
  type: string;
  data?: { id?: string };
}) {
  if (body.type !== "subscription_preapproval" || !body.data?.id) return;

  const client = getClient();
  const preApproval = new PreApproval(client);
  const sub = await preApproval.get({ id: body.data.id });

  const companyId = sub.external_reference ? parseInt(sub.external_reference) : null;
  if (!companyId) return;

  // Mapear estado MP → plan de GIRO
  const isActive = sub.status === "authorized";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planKey = getPlanFromMPPlanId((sub as any).preapproval_plan_id ?? "");

  await prisma.company.update({
    where: { id: companyId },
    data: {
      plan: isActive ? planKey : "FREE",
      subscriptionStatus: sub.status ?? "cancelled",
      mpSubscriptionId: sub.id,
      currentPeriodEnd: sub.next_payment_date ? new Date(sub.next_payment_date) : null,
    },
  });
}

function getPlanFromMPPlanId(mpPlanId: string): PlanKey {
  if (mpPlanId === MP_PLAN_IDS["ENTERPRISE"]) return "ENTERPRISE";
  if (mpPlanId === MP_PLAN_IDS["PRO"]) return "PRO";
  return "FREE";
}

/**
 * Cancela la suscripción activa de una empresa en MP.
 */
export async function cancelMPSubscription(companyId: number) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { mpSubscriptionId: true },
  });
  if (!company?.mpSubscriptionId || !process.env.MP_ACCESS_TOKEN) return;

  const client = getClient();
  const preApproval = new PreApproval(client);
  await preApproval.update({
    id: company.mpSubscriptionId,
    body: { status: "cancelled" },
  });

  await prisma.company.update({
    where: { id: companyId },
    data: { plan: "FREE", subscriptionStatus: "cancelled", mpSubscriptionId: null },
  });
}
