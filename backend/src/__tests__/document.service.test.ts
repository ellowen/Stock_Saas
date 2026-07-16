// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

jest.mock("../config/database/prisma", () => ({
  prisma: {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { DocumentService } from "../application/documents/document.service";

const mFindFirst = prisma.document.findFirst as jest.Mock;
const mUpdate = prisma.document.update as jest.Mock;

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("DocumentService.update", () => {
  let service: DocumentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentService();
  });

  it("permite editar un documento ISSUED (antes exigía DRAFT, inalcanzable)", async () => {
    mFindFirst.mockResolvedValue({ id: 1, companyId: 1, status: "ISSUED" });
    mUpdate.mockResolvedValue({ id: 1, notes: "nuevo" });

    const result = await service.update(1, 1, { notes: "nuevo" });

    expect(mUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ notes: "nuevo" }),
      })
    );
    expect(result.notes).toBe("nuevo");
  });

  it("rechaza editar un documento CANCELLED", async () => {
    mFindFirst.mockResolvedValue({ id: 1, companyId: 1, status: "CANCELLED" });
    await expect(service.update(1, 1, { notes: "x" })).rejects.toThrow(
      "Cannot edit a cancelled document"
    );
    expect(mUpdate).not.toHaveBeenCalled();
  });

  it("lanza error si el documento no existe", async () => {
    mFindFirst.mockResolvedValue(null);
    await expect(service.update(1, 999, { notes: "x" })).rejects.toThrow(
      "Document not found"
    );
    expect(mUpdate).not.toHaveBeenCalled();
  });
});
