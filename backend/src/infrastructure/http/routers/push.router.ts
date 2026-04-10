import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
} from "../../../presentation/http/controllers/push.controller";

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", authMiddleware, subscribe);
router.post("/unsubscribe", authMiddleware, unsubscribe);

export { router as pushRouter };
