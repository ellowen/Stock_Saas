import { Request, Response } from "express";
import { prisma } from "../../../config/database/prisma";

export const meController = async (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      companyId: true,
      branchId: true,
      isActive: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          name: true,
          plan: true,
          trialEndsAt: true,
          subscriptionStatus: true,
          currentPeriodEnd: true,
          stripeCustomerId: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { company, ...userWithoutCompany } = user;
  return res.json({
    auth: req.auth,
    user: userWithoutCompany,
    company: company ?? undefined,
  });
};

