import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { meController } from "../../../presentation/http/controllers/me.controller";
import { prisma } from "../../../config/database/prisma";

const router = Router();

router.get("/example", authMiddleware, (req, res) => {
  return res.json({
    message: "You are authenticated",
    auth: req.auth,
  });
});

router.get("/me", authMiddleware, meController);

// GET /protected/company — datos completos de la empresa del usuario
router.get("/company", authMiddleware, async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true, name: true, legalName: true, taxId: true,
      address: true, city: true, phone: true, email: true,
      currency: true, industryType: true, plan: true,
      trialEndsAt: true, subscriptionStatus: true,
      lowStockAlerts: true, salesReportFreq: true,
    },
  });
  if (!company) return res.status(404).json({ message: "Empresa no encontrada" });
  return res.json(company);
});

// PUT /protected/company — actualizar datos de la empresa (solo OWNER)
router.put("/company", authMiddleware, async (req: Request, res: Response) => {
  if (req.auth!.role !== "OWNER") {
    return res.status(403).json({ message: "Solo el dueño puede editar la empresa" });
  }
  const companyId = req.auth!.companyId;
  const { name, legalName, taxId, address, city, phone, email, currency, industryType, lowStockAlerts, salesReportFreq, artRate, unionRate, accountingEnabled } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "El nombre es requerido" });
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(legalName !== undefined && { legalName: legalName.trim() || null }),
      ...(taxId !== undefined && { taxId: taxId.trim() || null }),
      ...(address !== undefined && { address: address.trim() || null }),
      ...(city !== undefined && { city: city.trim() || null }),
      ...(phone !== undefined && { phone: phone.trim() || null }),
      ...(email !== undefined && { email: email.trim() || null }),
      ...(currency !== undefined && { currency }),
      ...(industryType !== undefined && { industryType }),
      ...(lowStockAlerts !== undefined && { lowStockAlerts: Boolean(lowStockAlerts) }),
      ...(salesReportFreq !== undefined && { salesReportFreq }),
      ...(artRate !== undefined && { artRate: Number(artRate) }),
      ...(unionRate !== undefined && { unionRate: Number(unionRate) }),
      ...(accountingEnabled !== undefined && { accountingEnabled: Boolean(accountingEnabled) }),
    },
    select: { id: true, name: true, legalName: true, taxId: true, address: true, city: true, phone: true, email: true, currency: true, industryType: true, lowStockAlerts: true, salesReportFreq: true, artRate: true, unionRate: true, accountingEnabled: true },
  });
  return res.json(updated);
});

export const protectedRouter = router;

