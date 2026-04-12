import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../../../config/database/prisma";
import {
  createARController,
  listARController,
  addARPaymentController,
  getARSummaryController,
} from "../../../presentation/http/controllers/accounts-receivable.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listARController);
router.post("/", createARController);
router.get("/summary", getARSummaryController);
router.post("/:id/pay", addARPaymentController);

// GET /accounts-receivable/aging — aging report: 0-30, 31-60, 61-90, 91+ days overdue
router.get("/aging", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const today = new Date();

  const open = await prisma.accountReceivable.findMany({
    where: { companyId, status: { not: "PAID" }, dueDate: { not: null } },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { dueDate: "asc" },
  });

  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d91plus: 0 };
  const rows = open.map((ar) => {
    const due = ar.dueDate ? new Date(ar.dueDate) : null;
    const overdueDays = due ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0;
    const outstanding = Number(ar.amount) - Number(ar.paid);

    if (overdueDays <= 0) buckets.current += outstanding;
    else if (overdueDays <= 30) buckets.d30 += outstanding;
    else if (overdueDays <= 60) buckets.d60 += outstanding;
    else if (overdueDays <= 90) buckets.d90 += outstanding;
    else buckets.d91plus += outstanding;

    return {
      id: ar.id,
      customer: ar.customer,
      amount: Number(ar.amount),
      paid: Number(ar.paid),
      outstanding,
      dueDate: ar.dueDate,
      overdueDays: Math.max(0, overdueDays),
      status: ar.status,
    };
  });

  return res.json({ buckets, rows });
});

export const accountsReceivableRouter = router;
