import { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

type CreateItemInput = {
  variantId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxConfigId?: number;
  sortOrder?: number;
};

type CreateDocumentInput = {
  type: DocumentType;
  customerId?: number;
  branchId: number;
  dueDate?: string;
  notes?: string;
  items: CreateItemInput[];
};

const STOCK_TYPES: DocumentType[] = ["REMITO", "INVOICE"];

export class DocumentService {
  private async computeNextNumber(
    companyId: number,
    type: DocumentType,
    tx: Prisma.TransactionClient
  ): Promise<number> {
    const last = await tx.document.findFirst({
      where: { companyId, type },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    return (last?.number ?? 0) + 1;
  }

  private calcItems(items: CreateItemInput[]) {
    return items.map((item) => {
      const lineBase = Number(item.unitPrice) * Number(item.quantity);
      const discount = Number(item.discount ?? 0);
      const afterDiscount = lineBase - discount;
      // taxAmount is calculated separately when we have the taxConfig rate
      return { ...item, lineBase, afterDiscount };
    });
  }

  async create(companyId: number, userId: number, input: CreateDocumentInput) {
    return prisma.$transaction(async (tx) => {
      const number = await this.computeNextNumber(companyId, input.type, tx);

      // Resolve tax rates
      const taxConfigIds = input.items
        .map((i) => i.taxConfigId)
        .filter((id): id is number => id != null);
      const taxConfigs =
        taxConfigIds.length > 0
          ? await tx.taxConfig.findMany({
              where: { id: { in: taxConfigIds } },
              select: { id: true, rate: true },
            })
          : [];
      const taxRateById = new Map(
        taxConfigs.map((tc) => [tc.id, Number(tc.rate)])
      );

      let subtotal = 0;
      let taxTotal = 0;
      let discountTotal = 0;

      const itemsData = input.items.map((item, idx) => {
        const lineBase =
          Number(item.unitPrice) * Number(item.quantity);
        const discount = Number(item.discount ?? 0);
        const afterDiscount = lineBase - discount;
        const rate = item.taxConfigId
          ? (taxRateById.get(item.taxConfigId) ?? 0)
          : 0;
        const taxAmount = afterDiscount * rate;
        const totalPrice = afterDiscount + taxAmount;

        subtotal += afterDiscount;
        taxTotal += taxAmount;
        discountTotal += discount;

        return {
          variantId: item.variantId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount,
          taxConfigId: item.taxConfigId ?? null,
          taxAmount,
          totalPrice,
          sortOrder: item.sortOrder ?? idx,
        };
      });

      const total = subtotal + taxTotal;

      const doc = await tx.document.create({
        data: {
          companyId,
          branchId: input.branchId,
          userId,
          customerId: input.customerId ?? null,
          type: input.type,
          number,
          status: "ISSUED",
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          notes: input.notes ?? null,
          subtotal,
          taxTotal,
          discountTotal,
          total,
          items: { create: itemsData },
        },
        include: { items: true, customer: true, branch: true, user: true },
      });

      // Decrement stock for REMITO / INVOICE
      if (STOCK_TYPES.includes(input.type)) {
        for (const item of input.items) {
          if (!item.variantId) continue;

          const inv = await tx.inventory.findFirst({
            where: {
              companyId,
              branchId: input.branchId,
              productVariantId: item.variantId,
            },
          });

          const before = inv?.quantity ?? 0;
          const after = Math.max(0, before - Math.floor(item.quantity));

          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantity: after },
            });
          }

          await tx.inventoryMovement.create({
            data: {
              companyId,
              branchId: input.branchId,
              productVariantId: item.variantId,
              type: "DOCUMENT_OUT",
              quantityBefore: before,
              quantityAfter: after,
              userId,
              referenceType: "document",
              referenceId: doc.id,
            },
          });
        }
      }

      return doc;
    });
  }

  async update(
    id: number,
    companyId: number,
    data: { notes?: string; dueDate?: string; customerId?: number }
  ) {
    const doc = await prisma.document.findFirst({
      where: { id, companyId },
    });
    if (!doc || doc.status !== "DRAFT") {
      throw new Error("Only DRAFT documents can be edited");
    }
    return prisma.document.update({
      where: { id },
      data: {
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        customerId: data.customerId,
      },
    });
  }

  async cancel(id: number, companyId: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const doc = await tx.document.findFirst({
        where: { id, companyId },
        include: { items: true },
      });
      if (!doc) throw new Error("Document not found");
      if (doc.status === "CANCELLED") throw new Error("Already cancelled");

      await tx.document.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      // Revert stock if REMITO / INVOICE was ISSUED
      if (
        STOCK_TYPES.includes(doc.type) &&
        doc.status === "ISSUED"
      ) {
        for (const item of doc.items) {
          if (!item.variantId) continue;

          const inv = await tx.inventory.findFirst({
            where: {
              companyId,
              branchId: doc.branchId,
              productVariantId: item.variantId,
            },
          });

          const qty = Math.floor(Number(item.quantity));
          const before = inv?.quantity ?? 0;
          const after = before + qty;

          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantity: after },
            });
          }

          await tx.inventoryMovement.create({
            data: {
              companyId,
              branchId: doc.branchId,
              productVariantId: item.variantId,
              type: "MANUAL_ADJUST",
              quantityBefore: before,
              quantityAfter: after,
              userId,
              referenceType: "document_cancel",
              referenceId: id,
            },
          });
        }
      }
    });
  }

  async list(
    companyId: number,
    filters?: {
      type?: DocumentType;
      status?: DocumentStatus;
      customerId?: number;
      from?: string;
      to?: string;
    }
  ) {
    const where: Prisma.DocumentWhereInput = { companyId };
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) {
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        where.date.lte = to;
      }
    }

    return prisma.document.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, taxId: true } },
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: number, companyId: number) {
    return prisma.document.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        branch: true,
        user: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true } },
                attributes: {
                  include: { attribute: true },
                  orderBy: { attribute: { sortOrder: "asc" } },
                },
              },
            },
            taxConfig: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        relatedDoc: { select: { id: true, type: true, number: true } },
      },
    });
  }

  async convertToInvoice(quoteId: number, companyId: number, userId: number) {
    const quote = await this.getById(quoteId, companyId);
    if (!quote) throw new Error("Quote not found");
    if (quote.type !== "QUOTE") throw new Error("Only QUOTE can be converted");
    if (quote.status === "CANCELLED") throw new Error("Quote is cancelled");

    const items: CreateItemInput[] = quote.items.map((item) => ({
      variantId: item.variantId ?? undefined,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      taxConfigId: item.taxConfigId ?? undefined,
      sortOrder: item.sortOrder,
    }));

    return prisma.$transaction(async (tx) => {
      const invoice = await this.create(companyId, userId, {
        type: "INVOICE",
        customerId: quote.customerId ?? undefined,
        branchId: quote.branchId,
        notes: quote.notes ?? undefined,
        items,
      });

      await tx.document.update({
        where: { id: invoice.id },
        data: { relatedDocId: quoteId },
      });
      await tx.document.update({
        where: { id: quoteId },
        data: { status: "ACCEPTED" },
      });

      return invoice;
    });
  }

  async createCreditNote(
    invoiceId: number,
    companyId: number,
    userId: number,
    itemOverrides?: CreateItemInput[]
  ) {
    const invoice = await this.getById(invoiceId, companyId);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.type !== "INVOICE") throw new Error("Only INVOICE can have a credit note");

    const items: CreateItemInput[] =
      itemOverrides ??
      invoice.items.map((item) => ({
        variantId: item.variantId ?? undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        taxConfigId: item.taxConfigId ?? undefined,
        sortOrder: item.sortOrder,
      }));

    return prisma.$transaction(async (tx) => {
      const creditNote = await this.create(companyId, userId, {
        type: "CREDIT_NOTE",
        customerId: invoice.customerId ?? undefined,
        branchId: invoice.branchId,
        notes: `Nota de crédito para factura #${invoice.number}`,
        items,
      });

      await tx.document.update({
        where: { id: creditNote.id },
        data: { relatedDocId: invoiceId },
      });

      return creditNote;
    });
  }
}
