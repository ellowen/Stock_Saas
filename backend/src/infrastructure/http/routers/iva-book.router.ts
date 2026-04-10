import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { IvaBookService } from "../../../application/accounting/iva-book.service";

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

export const ivaBookRouter = router;
