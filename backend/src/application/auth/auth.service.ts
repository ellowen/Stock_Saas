import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/database/prisma";
import { env } from "../../config/env";
import { UserRole } from "@prisma/client";

interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  companyName: string;
  fullName: string;
  username: string;
  password: string;
  email?: string | null;
}

interface AuthTokenPayload {
  sub: number;
  companyId: number;
  branchId?: number | null;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async login({ username, password }: LoginInput): Promise<AuthTokens> {
    const term = username.trim();
    const user = await prisma.user.findFirst({
      where: term.includes("@")
        ? { email: term }
        : { username: term },
    });

    if (!user || !user.isActive) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const payload: AuthTokenPayload = {
      sub: user.id,
      companyId: user.companyId,
      branchId: user.branchId,
      role: user.role,
    };

    const accessOptions: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
    const accessToken = jwt.sign(payload, env.jwtSecret, accessOptions);

    const refreshOptions: SignOptions = { expiresIn: env.jwtRefreshExpiresIn as SignOptions["expiresIn"] };
    const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, refreshOptions);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput): Promise<{ userId: number; companyId: number }> {
    const usernameTrim = input.username.trim();
    if (!usernameTrim) {
      throw new Error("USERNAME_REQUIRED");
    }

    const existing = await prisma.user.findUnique({
      where: { username: usernameTrim },
    });
    if (existing) {
      throw new Error("USERNAME_TAKEN");
    }

    const companyName = input.companyName.trim();
    if (!companyName) {
      throw new Error("COMPANY_NAME_REQUIRED");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          plan: "FREE",
          isActive: true,
          trialEndsAt,
          subscriptionStatus: "trialing",
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          username: usernameTrim,
          fullName: input.fullName.trim(),
          email: input.email?.trim() || null,
          password: passwordHash,
          role: UserRole.OWNER,
          isActive: true,
        },
      });

      return { userId: user.id, companyId: company.id };
    });

    return result;
  }
}

