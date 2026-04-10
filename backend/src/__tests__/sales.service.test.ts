import { Prisma } from "@prisma/client";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

jest.mock("../application/notifications/notifications.service", () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    checkAndNotifyLowStock: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../config/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    sale: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { SalesService } from "../application/sales/sales.service";

const mTx = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

type MockTx = {
  branch: { findFirst: jest.Mock };
  productVariant: { findMany: jest.Mock };
  inventory: { findMany: jest.Mock; updateMany: jest.Mock };
  sale: { create: jest.Mock; findUnique: jest.Mock };
  saleItem: { createMany: jest.Mock };
  inventoryMovement: { create: jest.Mock };
  accountReceivable: { create: jest.Mock };
};

function makeMockTx(overrides: Partial<MockTx> = {}): MockTx {
  return {
    branch: {
      findFirst: jest.fn().mockResolvedValue({ id: 1, name: "Casa Central", companyId: 10 }),
    },
    productVariant: {
      findMany: jest.fn().mockResolvedValue([
        { id: 101, companyId: 10, isActive: true, price: new Prisma.Decimal("1500.00") },
      ]),
    },
    inventory: {
      findMany: jest.fn().mockResolvedValue([{ productVariantId: 101, quantity: 10 }]),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    sale: {
      create: jest.fn().mockResolvedValue({ id: 999 }),
      findUnique: jest.fn().mockResolvedValue({
        id: 999,
        items: [],
        branch: { id: 1, name: "Casa Central" },
      }),
    },
    saleItem: { createMany: jest.fn().mockResolvedValue({}) },
    inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
    accountReceivable: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

function setupTx(overrides: Partial<MockTx> = {}) {
  const tx = makeMockTx(overrides);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mTx as any).mockImplementation(async (fn: (tx: MockTx) => unknown) => fn(tx));
  return tx;
}

const VALID_INPUT = {
  branchId: 1,
  paymentMethod: "CASH" as const,
  items: [{ productVariantId: 101, quantity: 2 }],
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("SalesService", () => {
  let service: SalesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SalesService();
    setupTx(); // default happy-path tx
  });

  // ── Validaciones ──────────────────────────────────────────────────────────────

  describe("createSale – validaciones", () => {
    it("throws NO_ITEMS when items array is empty", async () => {
      await expect(service.createSale(10, 1, { ...VALID_INPUT, items: [] }))
        .rejects.toThrow("NO_ITEMS");
      expect(mTx).not.toHaveBeenCalled();
    });

    it("throws BRANCH_NOT_FOUND when branch doesn't belong to company", async () => {
      setupTx({ branch: { findFirst: jest.fn().mockResolvedValue(null) } });
      await expect(service.createSale(10, 1, VALID_INPUT)).rejects.toThrow("BRANCH_NOT_FOUND");
    });

    it("throws INVALID_VARIANTS when variant doesn't exist/isn't active", async () => {
      setupTx({ productVariant: { findMany: jest.fn().mockResolvedValue([]) } });
      await expect(service.createSale(10, 1, VALID_INPUT)).rejects.toThrow("INVALID_VARIANTS");
    });

    it("throws INSUFFICIENT_STOCK when quantity exceeds available", async () => {
      setupTx({
        inventory: {
          findMany: jest.fn().mockResolvedValue([{ productVariantId: 101, quantity: 1 }]),
          updateMany: jest.fn(),
        },
      });
      await expect(
        service.createSale(10, 1, { ...VALID_INPUT, items: [{ productVariantId: 101, quantity: 2 }] })
      ).rejects.toThrow("INSUFFICIENT_STOCK");
    });
  });

  // ── Flujo exitoso ─────────────────────────────────────────────────────────────

  describe("createSale – flujo exitoso", () => {
    it("retorna el objeto de venta con id", async () => {
      const result = await service.createSale(10, 1, VALID_INPUT);
      expect(result).toHaveProperty("id", 999);
    });

    it("descuenta inventario por cada item vendido", async () => {
      const tx = setupTx();
      await service.createSale(10, 1, VALID_INPUT);
      expect(tx.inventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productVariantId: 101 }),
          data: { quantity: { decrement: 2 } },
        })
      );
    });

    it("registra movimiento SALE con quantityBefore y quantityAfter", async () => {
      const tx = setupTx();
      await service.createSale(10, 1, VALID_INPUT);
      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "SALE",
            quantityBefore: 10,
            quantityAfter: 8,
          }),
        })
      );
    });

    it("totalAmount = precio × cantidad − descuento por item", async () => {
      const tx = setupTx();
      await service.createSale(10, 1, {
        ...VALID_INPUT,
        items: [{ productVariantId: 101, quantity: 3, discount: 50 }],
        // 1500*3 - 50*3 = 4350
      });
      const call = (tx.sale.create as jest.Mock).mock.calls[0][0];
      expect(Number(call.data.totalAmount)).toBe(4350);
    });

    it("descuento global se aplica después del descuento por item", async () => {
      const tx = setupTx();
      await service.createSale(10, 1, {
        ...VALID_INPUT,
        items: [{ productVariantId: 101, quantity: 2 }], // 3000
        discountTotal: 300, // 3000 - 300 = 2700
      });
      const call = (tx.sale.create as jest.Mock).mock.calls[0][0];
      expect(Number(call.data.totalAmount)).toBe(2700);
    });

    it("totalAmount no puede ser negativo (queda en 0)", async () => {
      const tx = setupTx();
      await service.createSale(10, 1, {
        ...VALID_INPUT,
        items: [{ productVariantId: 101, quantity: 1 }], // 1500
        discountTotal: 9999, // mayor al total
      });
      const call = (tx.sale.create as jest.Mock).mock.calls[0][0];
      expect(Number(call.data.totalAmount)).toBe(0);
    });
  });

  // ── Cuenta corriente ──────────────────────────────────────────────────────────

  describe("createSale – pago CREDIT", () => {
    it("crea AccountReceivable cuando el pago es CREDIT y hay cliente", async () => {
      const tx = setupTx();
      await service.createSale(10, 1, {
        ...VALID_INPUT,
        paymentMethod: "CREDIT",
        customerId: 5,
      });
      expect(tx.accountReceivable.create).toHaveBeenCalled();
    });

    it("NO crea AccountReceivable para pago CASH", async () => {
      const tx = setupTx();
      await service.createSale(10, 1, VALID_INPUT);
      expect(tx.accountReceivable.create).not.toHaveBeenCalled();
    });
  });
});
