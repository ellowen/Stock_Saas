import { useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "../../lib/pdf";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { IconChart } from "../../components/Icons";
import { useReports, getDateRangePreset } from "./hooks/useReports";
import { SalesSummary } from "./sections/SalesSummary";
import { PeriodComparison } from "./sections/PeriodComparison";
import { SalesByDay } from "./sections/SalesByDay";
import { PaymentBreakdown } from "./sections/PaymentBreakdown";
import { TopProducts } from "./sections/TopProducts";
import { NoMovementReport } from "./sections/NoMovementReport";
import { TableSortHeader, sortByColumn } from "../../components/TableSortHeader";

function escapeCsvCell(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatReportDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function ReportsPage() {
  const { t } = useTranslation();
  const { canViewReports } = useAuth();
  const { showToast } = useToast();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [daySortKey, setDaySortKey] = useState<string | null>(null);
  const [daySortDir, setDaySortDir] = useState<"asc" | "desc">("asc");

  const chartIngresosDiaRef = useRef<HTMLDivElement>(null);
  const chartPagoPieRef = useRef<HTMLDivElement>(null);
  const chartPagoBarRef = useRef<HTMLDivElement>(null);
  const chartCategoriaRef = useRef<HTMLDivElement>(null);

  const {
    overview, overviewLoading, loadOverview,
    from, setFrom, to, setTo,
    detail, previousPeriod, detailLoading, detailError, loadDetail,
    noMovementDays, setNoMovementDays,
    noMovementBranchId, setNoMovementBranchId,
    noMovementLoading, noMovementData, loadNoMovement,
    branches,
  } = useReports();

  const handleExportChartsPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const refs = [
        { ref: chartIngresosDiaRef, title: "Ingresos por día" },
        { ref: chartPagoPieRef, title: "Ingresos por medio de pago" },
        { ref: chartPagoBarRef, title: "Ventas por medio de pago" },
        { ref: chartCategoriaRef, title: "Ventas por categoría" },
      ];
      type DocWithTable = jsPDF & { autoTable: (opts: Record<string, unknown>) => jsPDF };
      const doc = new jsPDF({ unit: "mm", format: "a4" }) as DocWithTable;
      const pageW = (doc as any).getPageWidth?.() ?? doc.internal.pageSize.width;
      const pageH = (doc as any).getPageHeight?.() ?? doc.internal.pageSize.height;
      const margin = 15;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2 - 20;
      const pxToMm = 0.264583;
      let first = true;
      for (const { ref, title } of refs) {
        const el = ref.current;
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        let wMm = canvas.width * pxToMm;
        let hMm = canvas.height * pxToMm;
        const scale = Math.min(maxW / wMm, maxH / hMm, 1);
        wMm *= scale; hMm *= scale;
        if (!first) doc.addPage();
        first = false;
        doc.setFontSize(12);
        doc.text(title, margin, 12);
        doc.addImage(imgData, "PNG", margin, 18, wMm, hMm);
      }
      doc.save("reporte-graficos.pdf");
      showToast(t("reports.exportedChartsPdf"));
    } catch {
      showToast(t("reports.exportedChartsPdfError"), "error");
    } finally {
      setExportingPdf(false);
    }
  }, [showToast]);

  function exportReportToCsv() {
    if (!detail) return;
    const rows: string[] = [
      "Reporte de ventas",
      `Período,${from},${to}`,
      "",
      "Resumen del período",
      "Ventas,Ingresos,Ítems vendidos",
      [detail.summary.totalSales, Number(detail.summary.totalRevenue).toFixed(2), detail.summary.totalItemsSold].map(escapeCsvCell).join(","),
      "",
      "Por método de pago",
      "Medio,Cant. ventas,Total",
      ...detail.byPaymentMethod.map((row) =>
        [row.paymentMethod, row.count, Number(row.totalAmount).toFixed(2)].map(escapeCsvCell).join(",")
      ),
      "",
      "Top productos",
      "Producto,SKU,Variante,Cant. vendida,Ingresos",
      ...detail.topProducts.map((row) =>
        [row.product?.name ?? "—", row.sku, row.variantLabel ?? "—", row.quantitySold, Number(row.revenue).toFixed(2)].map(escapeCsvCell).join(",")
      ),
      "",
      "Ventas por día",
      "Fecha,Cant. ventas,Total",
      ...detail.salesByDay.map((row) => [row.date, row.count, Number(row.totalAmount).toFixed(2)].map(escapeCsvCell).join(",")),
    ];
    const csv = "\uFEFF" + rows.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reporte-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportReportToPdf() {
    if (!detail) return;
    type DocWithTable = jsPDF & { autoTable: (opts: Record<string, unknown>) => jsPDF; lastAutoTable?: { finalY: number } };
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as DocWithTable;
    let y = 12;
    doc.setFontSize(16); doc.text("Reporte de ventas", 14, y); y += 8;
    doc.setFontSize(10); doc.text(`Período: ${from} a ${to}`, 14, y); y += 10;
    doc.setFontSize(11); doc.text("Resumen del período", 14, y); y += 6;
    doc.autoTable({
      head: [["Ventas", "Ingresos", "Ítems vendidos"]],
      body: [[String(detail.summary.totalSales), `$${Number(detail.summary.totalRevenue).toFixed(2)}`, String(detail.summary.totalItemsSold)]],
      startY: y, styles: { fontSize: 9 }, headStyles: { fillColor: [100, 116, 139] },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 10;
    doc.setFontSize(11); doc.text("Top productos", 14, y); y += 6;
    doc.autoTable({
      head: [["Producto", "SKU", "Variante", "Cant. vendida", "Ingresos"]],
      body: detail.topProducts.map((row) => [row.product?.name ?? "—", row.sku, row.variantLabel ?? "—", String(row.quantitySold), `$${Number(row.revenue).toFixed(2)}`]),
      startY: y, styles: { fontSize: 8 }, headStyles: { fillColor: [100, 116, 139] },
    });
    doc.save(`reporte-${from}-${to}.pdf`);
  }

  function exportNoMovementToCsv() {
    if (!noMovementData) return;
    const header = ["Producto", "Variante", "SKU", "Sucursal", "Cantidad", "Último movimiento"];
    const body = noMovementData.map((r) => [
      r.productName, r.variantLabel, r.sku, r.branchName, r.quantity,
      r.lastMovementAt ? new Date(r.lastMovementAt).toLocaleString("es-AR") : "Nunca",
    ]);
    const csv = "\uFEFF" + [header.map(escapeCsvCell).join(","), ...body.map((row) => row.map(escapeCsvCell).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sin-movimiento-${noMovementDays}-dias.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast("Reporte exportado en CSV.");
  }

  if (!canViewReports) return <Navigate to="/app/dashboard" replace />;

  const ticketPromedio = detail && detail.summary.totalSales > 0
    ? Number(detail.summary.totalRevenue) / detail.summary.totalSales
    : 0;
  const prev = previousPeriod?.summary;
  const pctVentas = prev ? percentChange(detail!.summary.totalSales, prev.totalSales) : null;
  const pctIngresos = prev ? percentChange(Number(detail!.summary.totalRevenue), Number(prev.totalRevenue)) : null;
  const pctItems = prev ? percentChange(detail!.summary.totalItemsSold, prev.totalItemsSold) : null;
  const bestDay = detail && detail.salesByDay.length > 0
    ? detail.salesByDay.reduce((best, d) => (Number(d.totalAmount) > Number(best.totalAmount) ? d : best), detail.salesByDay[0])
    : null;

  const sortedDay = sortByColumn(
    detail?.salesByDay ?? [],
    daySortKey, daySortDir,
    (row, k) => k === "date" ? row.date : k === "count" ? row.count : Number(row.totalAmount)
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{t("reports.title")}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{t("reports.subtitle")}</p>
      </div>

      <SalesSummary overview={overview} loading={overviewLoading} onRefresh={loadOverview} />

      {/* Reporte por período */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t("reports.periodReportTitle")}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("reports.periodReportSubtitle")}</p>
        </div>
        <div className="p-5 space-y-5">
          {/* Selector de fechas */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t("reports.dateRangeTitle")}</p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t("reports.fromLabel")}</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-minimal w-[140px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t("reports.toLabel")}</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-minimal w-[140px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["7", "30", "month", "lastMonth"] as const).map((preset) => (
                  <button
                    key={preset} type="button"
                    onClick={() => { const r = getDateRangePreset(preset); setFrom(r.from); setTo(r.to); }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                  >
                    {preset === "7" ? t("reports.last7") : preset === "30" ? t("reports.last30") : preset === "month" ? t("reports.thisMonth") : t("reports.lastMonth")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {from && to && from > to && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{t("reports.dateError")}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button" onClick={loadDetail}
              disabled={detailLoading || !from || !to || from > to}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <IconChart />
              {detailLoading ? t("reports.loading") : t("reports.viewReport")}
            </button>
            {detail && !detailLoading && (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-600 pl-3">{t("reports.download")}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { exportReportToCsv(); showToast(t("reports.exportedCsv")); }} className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">{t("reports.exportCsv")}</button>
                  <button type="button" onClick={() => { exportReportToPdf(); showToast(t("reports.exportedCsv")); }} className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">{t("reports.exportPdf")}</button>
                </div>
              </>
            )}
          </div>

          {detailError && <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>}

          {detail && !detailLoading && (
            <div className="space-y-8 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Reporte: {formatReportDate(from)} – {formatReportDate(to)}
                </h4>
                <button type="button" onClick={handleExportChartsPdf} disabled={exportingPdf} className="btn-secondary text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50">
                  {exportingPdf ? t("reports.exportingPdf") : t("reports.exportChartsPdf")}
                </button>
              </div>

              {previousPeriod && (
                <PeriodComparison from={from} to={to} detail={detail} previousPeriod={previousPeriod} />
              )}

              {/* Resumen del período */}
              <div>
                <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t("reports.periodSummaryTitle")}</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-xs text-slate-500">{t("reports.sales")}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{detail.summary.totalSales}</p>
                    {pctVentas !== null && <p className={`text-xs mt-0.5 font-medium ${pctVentas >= 0 ? "text-emerald-600" : "text-red-600"}`}>{pctVentas >= 0 ? "↑" : "↓"} {Math.abs(pctVentas)}% {t("reports.vsPrev")}</p>}
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                    <p className="text-xs text-emerald-700/80">{t("reports.revenue")}</p>
                    <p className="mt-1 text-xl font-bold text-emerald-800">${Number(detail.summary.totalRevenue).toFixed(2)}</p>
                    {pctIngresos !== null && <p className={`text-xs mt-0.5 font-medium ${pctIngresos >= 0 ? "text-emerald-600" : "text-red-600"}`}>{pctIngresos >= 0 ? "↑" : "↓"} {Math.abs(pctIngresos)}% {t("reports.vsPrev")}</p>}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-xs text-slate-500">{t("reports.itemsSold")}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{detail.summary.totalItemsSold}</p>
                    {pctItems !== null && <p className={`text-xs mt-0.5 font-medium ${pctItems >= 0 ? "text-emerald-600" : "text-red-600"}`}>{pctItems >= 0 ? "↑" : "↓"} {Math.abs(pctItems)}% {t("reports.vsPrev")}</p>}
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3">
                    <p className="text-xs text-indigo-700/80">{t("reports.avgTicket")}</p>
                    <p className="mt-1 text-xl font-bold text-indigo-800">${ticketPromedio.toFixed(2)}</p>
                  </div>
                  {bestDay && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                      <p className="text-xs text-amber-700/80">{t("reports.bestDay")}</p>
                      <p className="mt-1 text-lg font-bold text-amber-800">{new Date(bestDay.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</p>
                      <p className="text-xs font-medium text-amber-700">${Number(bestDay.totalAmount).toFixed(2)} · {bestDay.count} ventas</p>
                    </div>
                  )}
                </div>
              </div>

              <SalesByDay data={detail.salesByDay} />
              <PaymentBreakdown data={detail.byPaymentMethod} />
              <TopProducts topProducts={detail.topProducts} salesByCategory={detail.salesByCategory} />

              {/* Ventas por día (tabla detalle) */}
              <div>
                <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t("reports.dayDetailTitle")}</h5>
                <div className="table-modern">
                  <table>
                    <thead>
                      <tr>
                        <TableSortHeader label={t("reports.colDate")} sortKey="date" currentSortKey={daySortKey} currentSortDir={daySortDir} onSort={(k) => { setDaySortKey(k); setDaySortDir((d) => daySortKey === k && d === "asc" ? "desc" : "asc"); }} />
                        <TableSortHeader label={t("reports.colSales")} sortKey="count" currentSortKey={daySortKey} currentSortDir={daySortDir} onSort={(k) => { setDaySortKey(k); setDaySortDir((d) => daySortKey === k && d === "asc" ? "desc" : "asc"); }} />
                        <TableSortHeader label={t("reports.colTotalAmount")} sortKey="total" currentSortKey={daySortKey} currentSortDir={daySortDir} onSort={(k) => { setDaySortKey(k); setDaySortDir((d) => daySortKey === k && d === "asc" ? "desc" : "asc"); }} />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDay.length === 0 ? (
                        <tr><td colSpan={3} className="text-center text-slate-500 dark:text-slate-400 py-8">{t("reports.noData")}</td></tr>
                      ) : sortedDay.map((row) => (
                        <tr key={row.date}>
                          <td>{new Date(row.date + "T12:00:00").toLocaleDateString()}</td>
                          <td>{row.count}</td>
                          <td>${Number(row.totalAmount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!detail && !detailLoading && !detailError && (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">{t("reports.chooseRangeHint")}</p>
            </div>
          )}
        </div>
      </section>

      <NoMovementReport
        days={noMovementDays}
        onDaysChange={setNoMovementDays}
        branchId={noMovementBranchId}
        onBranchChange={setNoMovementBranchId}
        branches={branches}
        loading={noMovementLoading}
        data={noMovementData}
        onLoad={loadNoMovement}
        onExport={exportNoMovementToCsv}
      />
    </div>
  );
}
