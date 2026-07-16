// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

jest.mock("../config/database/prisma", () => ({
  prisma: {
    company: { findUnique: jest.fn() },
    account: { findMany: jest.fn(), findFirst: jest.fn() },
    journalEntry: { create: jest.fn() },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { AutoJournalService } from "../application/accounting/auto-journal.service";

const mCompany = prisma.company.findUnique as jest.Mock;
const mAccounts = prisma.account.findMany as jest.Mock;
const mJournalCreate = prisma.journalEntry.create as jest.Mock;

const BASE = { companyId: 1, createdBy: 1, receivableId: 42, amount: 200 };

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("AutoJournalService.onARPayment", () => {
  let service: AutoJournalService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    service = new AutoJournalService();
  });

  it("genera el asiento Caja/Banco (debe) vs Deudores por Ventas (haber) para pago en efectivo", async () => {
    mCompany.mockResolvedValue({ accountingEnabled: true });
    mAccounts.mockResolvedValue([
      { code: "1.1.01", id: 10 }, // Caja
      { code: "1.1.02", id: 11 }, // Banco
      { code: "1.1.06", id: 12 }, // Deudores
    ]);
    mJournalCreate.mockResolvedValue({});

    await service.onARPayment({ ...BASE, paymentMethod: "CASH" });

    expect(mJournalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reference: "AR-PAY-42",
          lines: {
            create: [
              expect.objectContaining({ accountId: 10, debit: 200, credit: 0 }), // Caja
              expect.objectContaining({ accountId: 12, debit: 0, credit: 200 }), // Deudores
            ],
          },
        }),
      })
    );
  });

  it("usa Banco en vez de Caja cuando el pago es con tarjeta", async () => {
    mCompany.mockResolvedValue({ accountingEnabled: true });
    mAccounts.mockResolvedValue([
      { code: "1.1.01", id: 10 },
      { code: "1.1.02", id: 11 },
      { code: "1.1.06", id: 12 },
    ]);
    mJournalCreate.mockResolvedValue({});

    await service.onARPayment({ ...BASE, paymentMethod: "CARD" });

    expect(mJournalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lines: {
            create: [
              expect.objectContaining({ accountId: 11, debit: 200, credit: 0 }), // Banco
              expect.objectContaining({ accountId: 12, debit: 0, credit: 200 }),
            ],
          },
        }),
      })
    );
  });

  it("no genera asiento si accountingEnabled es false", async () => {
    mCompany.mockResolvedValue({ accountingEnabled: false });
    await service.onARPayment({ ...BASE, paymentMethod: "CASH" });
    expect(mJournalCreate).not.toHaveBeenCalled();
  });

  it("no genera asiento si falta la cuenta Deudores por Ventas en el plan de cuentas", async () => {
    mCompany.mockResolvedValue({ accountingEnabled: true });
    mAccounts.mockResolvedValue([{ code: "1.1.01", id: 10 }]); // sin 1.1.06
    await service.onARPayment({ ...BASE, paymentMethod: "CASH" });
    expect(mJournalCreate).not.toHaveBeenCalled();
  });

  it("no genera asiento con monto 0 o negativo", async () => {
    mCompany.mockResolvedValue({ accountingEnabled: true });
    mAccounts.mockResolvedValue([
      { code: "1.1.01", id: 10 },
      { code: "1.1.06", id: 12 },
    ]);
    await service.onARPayment({ ...BASE, amount: 0, paymentMethod: "CASH" });
    expect(mJournalCreate).not.toHaveBeenCalled();
  });

  it("no propaga la excepción si prisma falla (fire-and-forget)", async () => {
    mCompany.mockResolvedValue({ accountingEnabled: true });
    mAccounts.mockResolvedValue([
      { code: "1.1.01", id: 10 },
      { code: "1.1.06", id: 12 },
    ]);
    mJournalCreate.mockRejectedValue(new Error("DB down"));
    await expect(service.onARPayment({ ...BASE, paymentMethod: "CASH" })).resolves.toBeUndefined();
  });
});
