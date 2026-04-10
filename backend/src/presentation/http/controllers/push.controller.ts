import { Request, Response } from "express";
import { pushService } from "../../../application/push/push.service";

/** GET /push/vapid-public-key */
export async function getVapidPublicKey(req: Request, res: Response) {
  return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
}

/** POST /push/subscribe */
export async function subscribe(req: Request, res: Response) {
  const { endpoint, keys } = req.body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: "Suscripción inválida" });
  }
  const { companyId, userId } = req.auth!;
  await pushService.subscribe(companyId, userId, endpoint, keys.p256dh, keys.auth);
  return res.status(201).json({ ok: true });
}

/** POST /push/unsubscribe */
export async function unsubscribe(req: Request, res: Response) {
  const { endpoint } = req.body ?? {};
  if (!endpoint) return res.status(400).json({ message: "endpoint requerido" });
  await pushService.unsubscribe(req.auth!.userId, endpoint);
  return res.json({ ok: true });
}
