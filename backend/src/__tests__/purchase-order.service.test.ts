// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

jest.mock("../config/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    purchaseOrder: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { PurchaseOrderService } from "../application/purchase-orders/purchase-order.service";

const mTx = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;
const mOrderFindFirst = prisma.purchaseOrder.findFirst as jest.Mock;
const mOrderUpdate = prisma.purchaseOrder.update as jest.Mock;

// ─── Helpers ───────────────────────────────────────────────────────────────────

type Tx = {
  purchaseOrder: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  purchaseOrderItem: { update: jest.Mock; findMany: jest.Mock };
  taxConfig: { findMany: jest.Mock };
  inventory: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  inventoryMovement: { create: jest.Mock };
};

function makeTx(overrides: Partial<Tx> = {}): Tx {
  return {
    purchaseOrder: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 1, ...data })),
      update: jest.fn().mockResolvedValue({}),
    },
    purchaseOrderItem: {
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    taxConfig: { findMany: jest.fn().mockResolvedValue([]) },
    inventory: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

function setupTx(overrides: Partial<Tx> = {}) {
  const tx = makeTx(overrides);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mTx as any).mockImplementation(async (fn: (tx: Tx) => unknown) => fn(tx));
  return tx;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("PurchaseOrderService", () => {
  let service: PurchaseOrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PurchaseOrderService();
  });

  // ── create: impuesto por item ────────────────────────────────────────────────

  describe("create", () => {
    it("calcula taxAmount por item y lo suma al total", async () => {
      const tx = setupTx({
        purchaseOrder: {
          findFirst: jest.fn().mockResolvedValue(null), // nextNumber
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 1, ...data })),
          update: jest.fn(),
        },
        taxConfig: { findMany: jest.fn().mockResolvedValue([{ id: 9, rate: 0.21 }]) },
      });
      const order = await service.create(1, 1, {
        supplierId: 1,
        branchId: 1,
        items: [{ description: "Item A", quantity: 10, unitPrice: 100, taxConfigId: 9 }],
      });
      // 10 * 100 = 1000 neto, +21% = 210 de impuesto, total 1210
      expect(tx.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total: 1210,
            items: {
              create: [
                expect.objectContaining({ taxConfigId: 9, taxAmount: 210 }),
              ],
            },
          }),
        })
      );
      expect(order).toBeDefined();
    });

    it("total = neto sin impuesto cuando el item no tiene taxConfigId", async () => {
      const tx = setupTx();
      await service.create(1, 1, {
        supplierId: 1,
        branchId: 1,
        items: [{ description: "Item A", quantity: 5, unitPrice: 40 }],
      });
      expect(tx.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ total: 200 }) })
      );
    });
  });

  // ── update: transiciones de status restringidas ──────────────────────────────

  describe("update", () => {
    it("rechaza forzar status a RECEIVED directamente", async () => {
      mOrderFindFirst.mockResolvedValue({ id: 1, status: "SENT" });
      await expect(
        service.update(1, 1, { status: "RECEIVED" as any })
      ).rejects.toThrow(/Cannot set status/);
      expect(mOrderUpdate).not.toHaveBeenCalled();
    });

    it("rechaza forzar status a PARTIALLY_RECEIVED directamente", async () => {
      mOrderFindFirst.mockResolvedValue({ id: 1, status: "SENT" });
      await expect(
        service.update(1, 1, { status: "PARTIALLY_RECEIVED" as any })
      ).rejects.toThrow(/Cannot set status/);
    });

    it("permite status DRAFT/SENT/CANCELLED por PUT", async () => {
      mOrderFindFirst.mockResolvedValue({ id: 1, status: "DRAFT" });
      mOrderUpdate.mockResolvedValue({ id: 1, status: "SENT" });
      await service.update(1, 1, { status: "SENT" as any });
      expect(mOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "SENT" }) })
      );
    });

    it("rechaza editar una orden ya RECEIVED", async () => {
      mOrderFindFirst.mockResolvedValue({ id: 1, status: "RECEIVED" });
      await expect(service.update(1, 1, { notes: "x" })).rejects.toThrow(
        /completed or cancelled/
      );
    });

    it("rechaza editar una orden ya CANCELLED", async () => {
      mOrderFindFirst.mockResolvedValue({ id: 1, status: "CANCELLED" });
      await expect(service.update(1, 1, { notes: "x" })).rejects.toThrow(
        /completed or cancelled/
      );
    });
  });

  // ── receive: recepción fraccionaria + status CANCELLED ───────────────────────

  describe("receive", () => {
    it("acepta cantidades fraccionarias: received exacto, stock redondeado", async () => {
      const tx = setupTx({
        purchaseOrder: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1,
            status: "SENT",
            branchId: 1,
            items: [{ id: 10, variantId: 100, unitPrice: 100, quantity: 10, taxConfigId: null }],
          }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 1, status: "PARTIALLY_RECEIVED", items: [] }),
        },
        purchaseOrderItem: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([{ received: 4.5, quantity: 10 }]),
        },
      });

      const result = await service.receive(1, 1, 1, [{ itemId: 10, received: 4.5 }]);

      // received guarda el valor exacto (4.5), no truncado
      expect(tx.purchaseOrderItem.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { received: { increment: 4.5 } },
      });
      // pero el stock (Int) redondea al entero mas cercano: Math.round(4.5) = 5
      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantityBefore: 0, quantityAfter: 5 }),
        })
      );
      expect(result.receivedAmount).toBe(450); // 4.5 * 100
    });

    it("rechaza recibir una orden CANCELLED", async () => {
      setupTx({
        purchaseOrder: {
          findFirst: jest.fn().mockResolvedValue({ id: 1, status: "CANCELLED", items: [] }),
          create: jest.fn(),
          update: jest.fn(),
        },
      });
      await expect(
        service.receive(1, 1, 1, [{ itemId: 10, received: 1 }])
      ).rejects.toThrow("Order is cancelled");
    });

    it("ignora items sin variantId vinculado (no mueve stock)", async () => {
      const tx = setupTx({
        purchaseOrder: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1,
            status: "SENT",
            branchId: 1,
            items: [{ id: 10, variantId: null, unitPrice: 100, quantity: 10, taxConfigId: null }],
          }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 1, status: "SENT", items: [] }),
        },
        purchaseOrderItem: {
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([{ received: 0, quantity: 10 }]),
        },
      });
      await service.receive(1, 1, 1, [{ itemId: 10, received: 5 }]);
      expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
      expect(tx.purchaseOrderItem.update).not.toHaveBeenCalled();
    });
  });
});
