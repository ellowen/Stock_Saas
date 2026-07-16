// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

jest.mock("../config/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    product: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { ProductService } from "../application/products/product.service";

const mTx = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;
const mProductFindFirst = prisma.product.findFirst as jest.Mock;

// ─── Helpers ───────────────────────────────────────────────────────────────────

type ProdTx = {
  product: { create: jest.Mock; update: jest.Mock; findUnique: jest.Mock };
  productVariant: { create: jest.Mock; update: jest.Mock };
  productVariantAttribute: { createMany: jest.Mock; deleteMany: jest.Mock };
  attribute: { findMany: jest.Mock };
};

function makeTx(overrides: Partial<ProdTx> = {}): ProdTx {
  return {
    product: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({ id: 1, variants: [] }),
    },
    productVariant: {
      create: jest.fn().mockResolvedValue({ id: 100 }),
      update: jest.fn().mockResolvedValue({}),
    },
    productVariantAttribute: {
      createMany: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    // por defecto, "posee" todos los attributeId que se le pidan (mismo companyId)
    attribute: {
      findMany: jest
        .fn()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(async ({ where }: any) =>
          (where.id.in as number[]).map((id) => ({ id }))
        ),
    },
    ...overrides,
  };
}

function setupTx(overrides: Partial<ProdTx> = {}) {
  const tx = makeTx(overrides);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mTx as any).mockImplementation(async (fn: (tx: ProdTx) => unknown) => fn(tx));
  return tx;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("ProductService", () => {
  let service: ProductService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductService();
  });

  // ── createProductWithVariants ────────────────────────────────────────────────

  describe("createProductWithVariants", () => {
    it("persiste size/color legacy en la variante", async () => {
      const tx = setupTx();
      await service.createProductWithVariants(1, {
        name: "Remera",
        variants: [{ sku: "SKU-1", price: 100, size: "XL", color: "Fucsia" }],
      });
      expect(tx.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ size: "XL", color: "Fucsia" }),
        })
      );
    });

    it("guarda null en size/color cuando no se envían (modo atributos flexibles)", async () => {
      const tx = setupTx();
      await service.createProductWithVariants(1, {
        name: "Remera",
        variants: [{ sku: "SKU-1", price: 100 }],
      });
      expect(tx.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ size: null, color: null }),
        })
      );
    });

    it("crea ProductVariantAttribute para cada atributo enviado", async () => {
      const tx = setupTx();
      await service.createProductWithVariants(1, {
        name: "Remera",
        variants: [{
          sku: "SKU-1",
          price: 100,
          attributes: [{ attributeId: 5, value: "M" }, { attributeId: 6, value: "Rojo" }],
        }],
      });
      expect(tx.productVariantAttribute.createMany).toHaveBeenCalledWith({
        data: [
          { variantId: 100, attributeId: 5, value: "M" },
          { variantId: 100, attributeId: 6, value: "Rojo" },
        ],
      });
    });

    it("no llama createMany de atributos si la variante no tiene ninguno", async () => {
      const tx = setupTx();
      await service.createProductWithVariants(1, {
        name: "Remera",
        variants: [{ sku: "SKU-1", price: 100 }],
      });
      expect(tx.productVariantAttribute.createMany).not.toHaveBeenCalled();
    });
  });

  // ── updateProduct ────────────────────────────────────────────────────────────

  describe("updateProduct", () => {
    it("persiste size/color al actualizar una variante existente", async () => {
      mProductFindFirst.mockResolvedValue({
        id: 1,
        variants: [{ id: 100 }],
      });
      const tx = setupTx();
      await service.updateProduct(1, 1, {
        variants: [{ id: 100, sku: "SKU-1", price: 100, size: "L", color: "Verde" }],
      });
      expect(tx.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100 },
          data: expect.objectContaining({ size: "L", color: "Verde" }),
        })
      );
    });

    it("reemplaza los atributos de una variante existente (delete + createMany)", async () => {
      mProductFindFirst.mockResolvedValue({ id: 1, variants: [{ id: 100 }] });
      const tx = setupTx();
      await service.updateProduct(1, 1, {
        variants: [{
          id: 100,
          sku: "SKU-1",
          price: 100,
          attributes: [{ attributeId: 5, value: "L" }],
        }],
      });
      expect(tx.productVariantAttribute.deleteMany).toHaveBeenCalledWith({
        where: { variantId: 100 },
      });
      expect(tx.productVariantAttribute.createMany).toHaveBeenCalledWith({
        data: [{ variantId: 100, attributeId: 5, value: "L" }],
      });
    });

    it("vacía los atributos de una variante cuando se envía un array vacío", async () => {
      mProductFindFirst.mockResolvedValue({ id: 1, variants: [{ id: 100 }] });
      const tx = setupTx();
      await service.updateProduct(1, 1, {
        variants: [{ id: 100, sku: "SKU-1", price: 100, attributes: [] }],
      });
      expect(tx.productVariantAttribute.deleteMany).toHaveBeenCalledWith({
        where: { variantId: 100 },
      });
      expect(tx.productVariantAttribute.createMany).not.toHaveBeenCalled();
    });

    it("crea atributos para una variante nueva agregada en la edición", async () => {
      mProductFindFirst.mockResolvedValue({ id: 1, variants: [] });
      const tx = setupTx();
      await service.updateProduct(1, 1, {
        variants: [{
          sku: "SKU-NEW",
          price: 50,
          attributes: [{ attributeId: 5, value: "S" }],
        }],
      });
      expect(tx.productVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sku: "SKU-NEW" }) })
      );
      expect(tx.productVariantAttribute.createMany).toHaveBeenCalledWith({
        data: [{ variantId: 100, attributeId: 5, value: "S" }],
      });
    });

    it("soft-elimina una variante removida del body y limpia sus atributos huérfanos", async () => {
      mProductFindFirst.mockResolvedValue({
        id: 1,
        variants: [{ id: 100 }, { id: 200 }],
      });
      const tx = setupTx();
      await service.updateProduct(1, 1, {
        variants: [{ id: 100, sku: "SKU-1", price: 100 }],
      });
      expect(tx.productVariant.update).toHaveBeenCalledWith({
        where: { id: 200 },
        data: { isActive: false },
      });
      expect(tx.productVariantAttribute.deleteMany).toHaveBeenCalledWith({
        where: { variantId: 200 },
      });
    });

    it("devuelve null si el producto no existe", async () => {
      mProductFindFirst.mockResolvedValue(null);
      const result = await service.updateProduct(1, 999, { name: "X" });
      expect(result).toBeNull();
      expect(mTx).not.toHaveBeenCalled();
    });
  });

  // ── aislamiento multi-tenant de atributos ────────────────────────────────────

  describe("aislamiento de attributeId entre empresas", () => {
    it("rechaza crear una variante con un attributeId que no pertenece a la empresa", async () => {
      setupTx({
        attribute: { findMany: jest.fn().mockResolvedValue([]) }, // ningún id es de esta empresa
      });
      await expect(
        service.createProductWithVariants(1, {
          name: "Remera",
          variants: [{ sku: "SKU-1", price: 100, attributes: [{ attributeId: 999, value: "M" }] }],
        })
      ).rejects.toThrow("INVALID_ATTRIBUTE");
    });

    it("rechaza editar una variante con un attributeId de otra empresa", async () => {
      mProductFindFirst.mockResolvedValue({ id: 1, variants: [{ id: 100 }] });
      setupTx({
        attribute: { findMany: jest.fn().mockResolvedValue([]) },
      });
      await expect(
        service.updateProduct(1, 1, {
          variants: [{ id: 100, sku: "SKU-1", price: 100, attributes: [{ attributeId: 999, value: "M" }] }],
        })
      ).rejects.toThrow("INVALID_ATTRIBUTE");
    });

    it("acepta cuando todos los attributeId pertenecen a la empresa", async () => {
      const tx = setupTx(); // default: findMany "posee" todos los ids pedidos
      await service.createProductWithVariants(1, {
        name: "Remera",
        variants: [{ sku: "SKU-1", price: 100, attributes: [{ attributeId: 5, value: "M" }] }],
      });
      expect(tx.productVariantAttribute.createMany).toHaveBeenCalled();
    });
  });
});
