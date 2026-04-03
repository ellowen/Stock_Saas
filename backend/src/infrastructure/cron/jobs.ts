import cron from "node-cron";
import { NotificationsService } from "../../application/notifications/notifications.service";

const notificationsService = new NotificationsService();

export function startCronJobs() {
  // Daily sales report — every day at 20:00
  cron.schedule("0 20 * * *", async () => {
    console.log("[CRON] Sending daily sales reports...");
    try {
      await notificationsService.sendSalesReport("DAILY");
    } catch (e) {
      console.error("[CRON] Daily report error:", e);
    }
  });

  // Weekly sales report — every Monday at 08:00
  cron.schedule("0 8 * * 1", async () => {
    console.log("[CRON] Sending weekly sales reports...");
    try {
      await notificationsService.sendSalesReport("WEEKLY");
    } catch (e) {
      console.error("[CRON] Weekly report error:", e);
    }
  });

  console.log("[CRON] Jobs scheduled.");
}
