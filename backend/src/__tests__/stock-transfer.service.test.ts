// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

jest.mock("../config/database/prisma", () => ({
  prisma: {
    stockTransfer: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { StockTransferService } from "../application/transfers/stock-transfer.service";

const mFindFirst = prisma.stockTransfer.findFirst as jest.Mock;
const mUpdate = prisma.stockTransfer.update as jest.Mock;

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("StockTransferService.cancel", () => {
  let service: StockTransferService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StockTransferService();
  });

  it("cancela un traspaso PENDING", async () => {
    mFindFirst.mockResolvedValue({ id: 1, companyId: 1, status: "PENDING" });
    mUpdate.mockResolvedValue({ id: 1, status: "CANCELLED" });

    const result = await service.cancel(1, 1);

    expect(mUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { status: "CANCELLED" },
      })
    );
    expect(result.status).toBe("CANCELLED");
  });

  it("rechaza cancelar un traspaso ya COMPLETED", async () => {
    mFindFirst.mockResolvedValue({ id: 1, companyId: 1, status: "COMPLETED" });
    await expect(service.cancel(1, 1)).rejects.toThrow("INVALID_STATUS");
    expect(mUpdate).not.toHaveBeenCalled();
  });

  it("rechaza cancelar un traspaso ya CANCELLED", async () => {
    mFindFirst.mockResolvedValue({ id: 1, companyId: 1, status: "CANCELLED" });
    await expect(service.cancel(1, 1)).rejects.toThrow("INVALID_STATUS");
    expect(mUpdate).not.toHaveBeenCalled();
  });

  it("lanza TRANSFER_NOT_FOUND si no existe o es de otra empresa", async () => {
    mFindFirst.mockResolvedValue(null);
    await expect(service.cancel(1, 999)).rejects.toThrow("TRANSFER_NOT_FOUND");
    expect(mUpdate).not.toHaveBeenCalled();
  });
});
