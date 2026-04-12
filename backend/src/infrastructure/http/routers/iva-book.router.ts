import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { IvaBookService } from "../../../application/accounting/iva-book.service";
import { prisma } from "../../../config/database/prisma";

const router = Router();
const service = new IvaBookService();

router.use(authMiddleware);

// GET /iva-book/ventas?from=&to=&export=csv
router.get("/ventas", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { from, to, export: exportCsv } = req.query as Record<string, string>;

  const result = await service.getVentas(
    companyId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );

  if (exportCsv === "csv") {
    const csv = service.toCSVVentas(result.rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="libro-iva-ventas.csv"`);
    return res.send("\uFEFF" + csv); // BOM for Excel
  }

  res.json(result);
});

// GET /iva-book/compras?from=&to=&export=csv
router.get("/compras", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { from, to, export: exportCsv } = req.query as Record<string, string>;

  const result = await service.getCompras(
    companyId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );

  if (exportCsv === "csv") {
    const csv = service.toCSVCompras(result.rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="libro-iva-compras.csv"`);
    return res.send("\uFEFF" + csv);
  }

  res.json(result);
});

// GET /iva-book/balance?from=&to=
// Computes IVA DF (ventas) and IVA CF (compras) from journal entries for configured accounts
router.get("/balance", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { from, to } = req.query as Record<string, string>;

  const dateFilter: any = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);
  const hasDates = Object.keys(dateFilter).length > 0;

  // Find IVA accounts by code pattern (1.1.05 = CF, 2.1.02 = DF)
  const [cfAccount, dfAccount] = await Promise.all([
    prisma.account.findFirst({ where: { companyId, code: "1.1.05" } }),
    prisma.account.findFirst({ where: { companyId, code: "2.1.02" } }),
  ]);

  const lineWhere = (accountId: number) => ({
    accountId,
    journalEntry: {
      companyId,
      status: "POSTED" as const,
      ...(hasDates ? { date: dateFilter } : {}),
    },
  });

  const [cfLines, dfLines] = await Promise.all([
    cfAccount ? prisma.journalLine.findMany({ where: lineWhere(cfAccount.id), select: { debit: true, credit: true } }) : Promise.resolve([]),
    dfAccount ? prisma.journalLine.findMany({ where: lineWhere(dfAccount.id), select: { debit: true, credit: true } }) : Promise.resolve([]),
  ]);

  // IVA CF = net debit on account 1.1.05
  const ivaCF = cfLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
  // IVA DF = net credit on account 2.1.02
  const ivaDF = dfLines.reduce((s, l) => s + Number(l.credit) - Number(l.debit), 0);
  const saldo = ivaDF - ivaCF; // positive = to pay AFIP; negative = credit in favor

  res.json({
    ivaDF: Math.max(0, ivaDF),
    ivaCF: Math.max(0, ivaCF),
    saldo,
    hasAccountingData: cfAccount !== null || dfAccount !== null,
  });
});

export const ivaBookRouter = router;
