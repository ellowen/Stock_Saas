import bcrypt from "bcryptjs";

// ─── Mocks (hoisted: no references to outer vars) ─────────────────────────────

jest.mock("../config/database/prisma", () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    company: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("../infrastructure/email/sendPasswordResetEmail", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { prisma } from "../config/database/prisma";
import { AuthService } from "../application/auth/auth.service";

// Typed mock helpers
const mUser = prisma.user as jest.Mocked<typeof prisma.user>;
const mCompany = prisma.company as jest.Mocked<typeof prisma.company>;
const mPRT = prisma.passwordResetToken as jest.Mocked<typeof prisma.passwordResetToken>;
const mTx = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    id: 1,
    companyId: 10,
    branchId: null,
    username: "testuser",
    email: "test@example.com",
    password: bcrypt.hashSync("secret123", 1),
    role: "OWNER",
    isActive: true,
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  // ── login ────────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("returns access and refresh tokens for valid credentials", async () => {
      mUser.findFirst.mockResolvedValue(makeUser() as never);
      mUser.update.mockResolvedValue({} as never);

      const result = await service.login({ username: "testuser", password: "secret123" });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(typeof result.accessToken).toBe("string");
    });

    it("searches by email when username contains @", async () => {
      mUser.findFirst.mockResolvedValue(makeUser() as never);
      mUser.update.mockResolvedValue({} as never);

      await service.login({ username: "test@example.com", password: "secret123" });

      expect(mUser.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "test@example.com" } })
      );
    });

    it("throws INVALID_CREDENTIALS when user not found", async () => {
      mUser.findFirst.mockResolvedValue(null as never);

      await expect(service.login({ username: "nobody", password: "pass" }))
        .rejects.toThrow("INVALID_CREDENTIALS");
    });

    it("throws INVALID_CREDENTIALS when user is inactive", async () => {
      mUser.findFirst.mockResolvedValue(makeUser({ isActive: false }) as never);

      await expect(service.login({ username: "testuser", password: "secret123" }))
        .rejects.toThrow("INVALID_CREDENTIALS");
    });

    it("throws INVALID_CREDENTIALS for wrong password", async () => {
      mUser.findFirst.mockResolvedValue(makeUser() as never);

      await expect(service.login({ username: "testuser", password: "wrongpass" }))
        .rejects.toThrow("INVALID_CREDENTIALS");
    });

    it("updates lastLogin on successful login", async () => {
      mUser.findFirst.mockResolvedValue(makeUser() as never);
      mUser.update.mockResolvedValue({} as never);

      await service.login({ username: "testuser", password: "secret123" });

      expect(mUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { lastLogin: expect.any(Date) },
        })
      );
    });
  });

  // ── register ─────────────────────────────────────────────────────────────────

  describe("register", () => {
    beforeEach(() => {
      mUser.findUnique.mockResolvedValue(null as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mTx as any).mockImplementation(async (fn: any) => {
        const tx = {
          company: { create: jest.fn().mockResolvedValue({ id: 10 }) },
          user: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        };
        return fn(tx);
      });
    });

    it("returns userId and companyId on success", async () => {
      const result = await service.register({
        companyName: "Acme",
        fullName: "John Doe",
        username: "johndoe",
        password: "password123",
        email: "john@acme.com",
      });

      expect(result).toMatchObject({ userId: 1, companyId: 10 });
    });

    it("sets trialEndsAt to ~90 days from now", async () => {
      let capturedTrialEndsAt: Date | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mTx as any).mockImplementation(async (fn: any) => {
        const tx = {
          company: {
            create: jest.fn().mockImplementation(({ data }: { data: { trialEndsAt: Date } }) => {
              capturedTrialEndsAt = data.trialEndsAt;
              return Promise.resolve({ id: 10 });
            }),
          },
          user: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        };
        return fn(tx);
      });

      await service.register({ companyName: "Acme", fullName: "J", username: "j1", password: "p" });

      const diffDays = (capturedTrialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(88);
      expect(diffDays).toBeLessThan(92);
    });

    it("throws USERNAME_TAKEN when username already exists", async () => {
      mUser.findUnique.mockResolvedValue(makeUser() as never);

      await expect(
        service.register({ companyName: "X", fullName: "Y", username: "testuser", password: "p" })
      ).rejects.toThrow("USERNAME_TAKEN");
    });

    it("throws USERNAME_REQUIRED for blank username", async () => {
      await expect(
        service.register({ companyName: "X", fullName: "Y", username: "  ", password: "p" })
      ).rejects.toThrow("USERNAME_REQUIRED");
    });

    it("throws COMPANY_NAME_REQUIRED for blank company name", async () => {
      await expect(
        service.register({ companyName: "   ", fullName: "Y", username: "user1", password: "p" })
      ).rejects.toThrow("COMPANY_NAME_REQUIRED");
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────────

  describe("forgotPassword", () => {
    it("does nothing if company is not found", async () => {
      mCompany.findFirst.mockResolvedValue(null as never);

      await expect(service.forgotPassword("Unknown", "x@x.com")).resolves.toBeUndefined();
      expect(mPRT.create).not.toHaveBeenCalled();
    });

    it("does nothing if user is not found in company", async () => {
      mCompany.findFirst.mockResolvedValue({ id: 10 } as never);
      mUser.findFirst.mockResolvedValue(null as never);

      await expect(service.forgotPassword("Acme", "nobody@acme.com")).resolves.toBeUndefined();
      expect(mPRT.create).not.toHaveBeenCalled();
    });

    it("creates a reset token and calls sendPasswordResetEmail", async () => {
      const { sendPasswordResetEmail } = await import("../infrastructure/email/sendPasswordResetEmail");
      mCompany.findFirst.mockResolvedValue({ id: 10 } as never);
      mUser.findFirst.mockResolvedValue({ id: 1, email: "test@acme.com" } as never);
      mPRT.create.mockResolvedValue({} as never);

      await service.forgotPassword("Acme", "test@acme.com");

      expect(mPRT.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 1,
            tokenHash: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        })
      );
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────────

  describe("resetPassword", () => {
    it("throws INVALID_OR_EXPIRED_TOKEN when token not found", async () => {
      mPRT.findFirst.mockResolvedValue(null as never);

      await expect(service.resetPassword("badtoken", "newpass"))
        .rejects.toThrow("INVALID_OR_EXPIRED_TOKEN");
    });

    it("calls $transaction to update password when token is valid", async () => {
      mPRT.findFirst.mockResolvedValue({ userId: 1, user: makeUser() } as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mTx as any).mockResolvedValue([]);

      await service.resetPassword("validtoken", "newPassword123");

      expect(mTx).toHaveBeenCalled();
    });
  });
});
