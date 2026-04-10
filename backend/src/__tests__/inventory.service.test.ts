// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

jest.mock("../config/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    inventory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { InventoryService } from "../application/inventory/inventory.service";

const mTx = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const BASE = { companyId: 10, branchId: 1, productVariantId: 101 };

type InvTx = {
  inventory: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  inventoryMovement: { create: jest.Mock };
};

function makeInvTx(overrides: Partial<InvTx> = {}): InvTx {
  return {
    inventory: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 99, quantity: 5 }),
      update: jest.fn().mockResolvedValue({ id: 99, quantity: 5 }),
    },
    inventoryMovement: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

function setupTx(overrides: Partial<InvTx> = {}) {
  const tx = makeInvTx(overrides);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mTx as any).mockImplementation(async (fn: (tx: InvTx) => unknown) => fn(tx));
  return tx;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("InventoryService", () => {
  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService();
  });

  // ── adjust ────────────────────────────────────────────────────────────────────

  describe("adjust", () => {
    it("crea un nuevo registro cuando no existe inventario previo", async () => {
      const tx = setupTx(); // findUnique returns null → create path
      await service.adjust({ ...BASE, quantityDelta: 5 });
      expect(tx.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: 5 }) })
      );
      expect(tx.inventory.update).not.toHaveBeenCalled();
    });

    it("actualiza el registro existente sumando el delta", async () => {
      const tx = setupTx({
        inventory: {
          findUnique: jest.fn().mockResolvedValue({ id: 50, quantity: 10 }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 50, quantity: 15 }),
        },
      });
      await service.adjust({ ...BASE, quantityDelta: 5 });
      expect(tx.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 15 } })
      );
      expect(tx.inventory.create).not.toHaveBeenCalled();
    });

    it("crea movimiento MANUAL_ADJUST con quantityBefore y quantityAfter", async () => {
      const tx = setupTx({
        inventory: {
          findUnique: jest.fn().mockResolvedValue({ id: 50, quantity: 10 }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 50, quantity: 12 }),
        },
      });
      await service.adjust({ ...BASE, quantityDelta: 2, userId: 7 });
      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "MANUAL_ADJUST",
            quantityBefore: 10,
            quantityAfter: 12,
            userId: 7,
          }),
        })
      );
    });

    it("throws INSUFFICIENT_STOCK cuando el delta deja cantidad negativa", async () => {
      setupTx({
        inventory: {
          findUnique: jest.fn().mockResolvedValue({ id: 50, quantity: 3 }),
          create: jest.fn(),
          update: jest.fn(),
        },
      });
      await expect(service.adjust({ ...BASE, quantityDelta: -5 }))
        .rejects.toThrow("INSUFFICIENT_STOCK");
    });

    it("acepta delta negativo si hay stock suficiente", async () => {
      const tx = setupTx({
        inventory: {
          findUnique: jest.fn().mockResolvedValue({ id: 50, quantity: 10 }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 50, quantity: 7 }),
        },
      });
      await service.adjust({ ...BASE, quantityDelta: -3 });
      expect(tx.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 7 } })
      );
    });

    it("quantityBefore = 0 cuando no había registro previo", async () => {
      const tx = setupTx(); // findUnique → null
      await service.adjust({ ...BASE, quantityDelta: 5 });
      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantityBefore: 0, quantityAfter: 5 }),
        })
      );
    });
  });

  // ── setQuantity ───────────────────────────────────────────────────────────────

  describe("setQuantity", () => {
    it("throws INVALID_QUANTITY cuando la cantidad es negativa", async () => {
      await expect(service.setQuantity({ ...BASE, quantity: -1 }))
        .rejects.toThrow("INVALID_QUANTITY");
    });

    it("acepta cantidad 0 (vaciado de stock)", async () => {
      const tx = setupTx({
        inventory: {
          findUnique: jest.fn().mockResolvedValue({ id: 50, quantity: 5 }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 50, quantity: 0 }),
        },
      });
      await service.setQuantity({ ...BASE, quantity: 0 });
      expect(tx.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: 0 }) })
      );
    });

    it("actualiza minStock y location cuando se proveen", async () => {
      const tx = setupTx({
        inventory: {
          findUnique: jest.fn().mockResolvedValue({ id: 50, quantity: 5 }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 50, quantity: 20 }),
        },
      });
      await service.setQuantity({ ...BASE, quantity: 20, minStock: 5, location: "A-01" });
      expect(tx.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantity: 20, minStock: 5, location: "A-01" }),
        })
      );
    });
  });
});
