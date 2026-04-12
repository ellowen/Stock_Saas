import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { AccountingReportsService } from "../../../application/accounting/reports.service";

const router = Router();
const service = new AccountingReportsService();

router.use(authMiddleware);
router.use(requirePermission("ACCOUNTING_VIEW"));

// GET /accounting-reports/trial-balance?from=&to=&export=csv
router.get("/trial-balance", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { from, to, export: exportCsv } = req.query as Record<string, string>;

  const data = await service.trialBalance(
    companyId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );

  if (exportCsv === "csv") {
    const csv = service.toCSVTrialBalance(data.rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="balance-sumas-saldos.csv"');
    return res.send("\uFEFF" + csv);
  }

  res.json(data);
});

// GET /accounting-reports/ledger/:accountId?from=&to=&export=csv
router.get("/ledger/:accountId", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const accountId = parseInt(req.params["accountId"] as string);
  if (isNaN(accountId)) return res.status(400).json({ message: "ID inválido" });

  const { from, to, export: exportCsv } = req.query as Record<string, string>;

  try {
    const data = await service.ledger(
      companyId,
      accountId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );

    if (exportCsv === "csv") {
      const csv = service.toCSVLedger(data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="libro-mayor-${data.account.code}.csv"`
      );
      return res.send("\uFEFF" + csv);
    }

    res.json(data);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
});

// GET /accounting-reports/income-statement?from=&to=&export=csv
router.get("/income-statement", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { from, to, export: exportCsv } = req.query as Record<string, string>;

  const data = await service.incomeStatement(
    companyId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );

  if (exportCsv === "csv") {
    const csv = service.toCSVIncomeStatement(data);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="estado-resultados.csv"');
    return res.send("\uFEFF" + csv);
  }

  res.json(data);
});

export const accountingReportsRouter = router;
