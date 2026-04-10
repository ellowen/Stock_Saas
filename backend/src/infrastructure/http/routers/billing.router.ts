import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
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
router.post("/subscribe", subscribe);
router.post("/cancel", cancelSubscription);
router.get("/portal", stripePortal);

export { router as billingRouter };
