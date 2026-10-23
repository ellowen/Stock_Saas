import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import {
  getUsage,
  subscribe,
  cancelSubscription,
  stripePortal,
  mpWebhook,
  stripeWebhook,
} from "../../../presentation/http/controllers/billing.controller";
import express from "express";

const router = Router();

// Webhooks — sin auth, antes del json parser global (raw body para Stripe)
router.post("/webhook/stripe", express.raw({ type: "application/json" }), stripeWebhook);
router.post("/webhook/mp", mpWebhook);

// Rutas autenticadas
router.use(authMiddleware);
router.get("/usage", getUsage);
// Solo el dueño puede contratar, cancelar o gestionar el pago de la suscripción.
router.post("/subscribe", requireRole(["OWNER"]), subscribe);
router.post("/cancel", requireRole(["OWNER"]), cancelSubscription);
router.get("/portal", requireRole(["OWNER"]), stripePortal);

export { router as billingRouter };
