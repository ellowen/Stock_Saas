import { ARStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

export class AccountsReceivableService {
  async create(companyId: number, data: {
    customerId: number;
    saleId?: number;
    amount: number;
    dueDate?: string;
    notes?: string;
  }) {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId },
    });
    if (!customer) throw new Error("CUSTOMER_NOT_FOUND");

    return prisma.accountReceivable.create({
      data: {
        companyId,
        customerId: data.customerId,
        saleId: data.saleId ?? null,
        amount: new Prisma.Decimal(data.amount),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes ?? null,
      },
      include: { customer: { select: { id: true, name: true } }, payments: true },
    });
  }

  async list(companyId: number, opts?: { customerId?: number; status?: ARStatus }) {
    const where: { companyId: number; customerId?: number; status?: ARStatus } = { companyId };
    if (opts?.customerId) where.customerId = opts.customerId;
    if (opts?.status) where.status = opts.status;

    return prisma.accountReceivable.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, taxId: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async addPayment(companyId: number, receivableId: number, data: {
    amount: number;
    method: PaymentMethod;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const ar = await tx.accountReceivable.findFirst({
        where: { id: receivableId, companyId },
        include: { payments: true },
      });
      if (!ar) throw new Error("AR_NOT_FOUND");
      if (ar.status === ARStatus.PAID) throw new Error("AR_ALREADY_PAID");

      const paymentAmount = new Prisma.Decimal(data.amount);
      const remaining = ar.amount.sub(ar.paid);
      if (paymentAmount.greaterThan(remaining)) throw new Error("PAYMENT_EXCEEDS_BALANCE");

      await tx.aRPayment.create({
        data: {
          receivableId,
          amount: paymentAmount,
          method: data.method,
          notes: data.notes ?? null,
        },
      });

      const newPaid = ar.paid.add(paymentAmount);
      const newStatus = newPaid.greaterThanOrEqualTo(ar.amount)
        ? ARStatus.PAID
        : ARStatus.PARTIAL;

      return tx.accountReceivable.update({
        where: { id: receivableId },
        data: { paid: newPaid, status: newStatus },
        include: { customer: { select: { id: true, name: true } }, payments: true },
      });
    });
  }

  async getTotalPending(companyId: number) {
    const result = await prisma.accountReceivable.aggregate({
      where: {
        companyId,
        status: { in: [ARStatus.PENDING, ARStatus.PARTIAL, ARStatus.OVERDUE] },
      },
      _sum: { amount: true, paid: true },
      _count: true,
    });
    const totalAmount = result._sum.amount ?? new Prisma.Decimal(0);
    const totalPaid = result._sum.paid ?? new Prisma.Decimal(0);
    return {
      count: result._count,
      totalDebt: totalAmount.sub(totalPaid).toNumber(),
    };
  }
}
