import cron from "node-cron";
import { NotificationsService } from "../../application/notifications/notifications.service";
import { AccountsReceivableService } from "../../application/accounts/accounts-receivable.service";

const notificationsService = new NotificationsService();
const accountsReceivableService = new AccountsReceivableService();

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

  // Mark overdue accounts receivable — every day at 00:30
  cron.schedule("30 0 * * *", async () => {
    console.log("[CRON] Marking overdue accounts receivable...");
    try {
      const count = await accountsReceivableService.markOverdue();
      console.log(`[CRON] ${count} account(s) marked OVERDUE.`);
    } catch (e) {
      console.error("[CRON] markOverdue error:", e);
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
