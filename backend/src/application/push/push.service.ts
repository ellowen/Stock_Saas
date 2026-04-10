import webpush from "web-push";
import { prisma } from "../../config/database/prisma";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@giro.app",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? "",
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

class PushService {
  /** Save or update a browser push subscription for a user. */
  async subscribe(
    companyId: number,
    userId: number,
    endpoint: string,
    p256dh: string,
    auth: string,
  ) {
    // Upsert based on userId + endpoint prefix (first 255 chars used in unique index)
    const existing = await prisma.pushSubscription.findFirst({
      where: { userId, endpoint: { startsWith: endpoint.slice(0, 200) } },
    });
    if (existing) {
      return prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { p256dh, auth },
      });
    }
    return prisma.pushSubscription.create({
      data: { companyId, userId, endpoint, p256dh, auth },
    });
  }

  /** Remove a subscription by endpoint. */
  async unsubscribe(userId: number, endpoint: string) {
    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: { startsWith: endpoint.slice(0, 200) } },
    });
  }

  /** Send a push notification to all subscriptions of a company. */
  async sendToCompany(companyId: number, payload: PushPayload) {
    const subs = await prisma.pushSubscription.findMany({
      where: { companyId },
    });
    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          )
          .catch(async (err: { statusCode?: number }) => {
            // 410 Gone = subscription expired — clean it up
            if (err.statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            }
          }),
      ),
    );
  }

  /** Send a push notification to a single user. */
  async sendToUser(userId: number, payload: PushPayload) {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          )
          .catch(async (err: { statusCode?: number }) => {
            if (err.statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            }
          }),
      ),
    );
  }
}

export const pushService = new PushService();
