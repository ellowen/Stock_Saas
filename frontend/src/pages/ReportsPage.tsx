import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "../lib/pdf";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { IconChart } from "../components/Icons";
import { TableSortHeader, sortByColumn } from "../components/TableSortHeader";
import { SkeletonReportCards } from "../components/Skeleton";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  MIXED: "Mixto",
  OTHER: "Otro",
};

async function exportChartAsPng(element: HTMLElement | null, filename: string): Promise<void> {
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

async function exportChartsToPdf(
  chartRefs: { ref: React.RefObject<HTMLElement | null>; title: string }[]
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.getPageWidth();
  const pageH = doc.getPageHeight();
  const margin = 15;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2 - 20;

  const pxToMm = 0.264583;
  for (let i = 0; i < chartRefs.length; i++) {
    const el = chartRefs[i].ref.current;
    if (!el) continue;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    let wMm = canvas.width * pxToMm;
    let hMm = canvas.height * pxToMm;
    const scale = Math.min(maxW / wMm, maxH / hMm, 1);
    wMm *= scale;
    hMm *= scale;
    if (i > 0) doc.addPage();
    doc.setFontSize(12);
    doc.text(chartRefs[i].title, margin, 12);
    doc.addImage(imgData, "PNG", margin, 18, wMm, hMm);
  }

  doc.save("reporte-graficos.pdf");
}

type Overview = {
  totalSales: number;
  totalRevenue: number;
  totalItemsSold: number;
  productsCount: number;
  variantsCount: number;
  totalStockUnits: number;
};

type ReportDetail = {
  summary: { totalSales: number; totalRevenue: number; totalItemsSold: number };
  byPaymentMethod: { paymentMethod: string; count: number; totalAmount: number }[];
  topProducts: {
    productVariantId: number;
    quantitySold: number;
    revenue: number;
    sku: string;
    size: string;
    color: string;
    product: { id: number; name: string; category: string | null; brand: string | null } | null;
  }[];
  salesByDay: { date: string; count: number; totalAmount: number }[];
  salesByCategory?: { category: string; revenue: number; quantitySold: number }[];
};

type NoMovementRow = {
  productVariantId: number;
  productName: string;
  variantLabel: string;
  sku: string;
  branchId: number;
  branchName: string;
  quantity: number;
  lastMovementAt: string | null;
};

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatReportDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDateRangePreset(preset: "7" | "30" | "month" | "lastMonth"): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  if (preset === "7") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: from.toISOString().slice(0, 10), to };
  }
  if (preset === "30") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: from.toISOString().slice(0, 10), to };
  }
  if (preset === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to };
  }
  // lastMonth
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastTo = new Date(today.getFullYear(), today.getMonth(), 0);
  return { from: from.toISOString().slice(0, 10), to: lastTo.toISOString().slice(0, 10) };
}

const CHART_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#64748b"];

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function escapeCsvCell(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportReportToCsv(detail: ReportDetail, from: string, to: string) {
  const rows: string[] = [];
  rows.push("Reporte de ventas");
  rows.push(`Período,${from},${to}`);
  rows.push("");
  rows.push("Resumen del período");
  rows.push("Ventas,Ingresos,Ítems vendidos");
  rows.push(
    [detail.summary.totalSales, Number(detail.summary.totalRevenue).toFixed(2), detail.summary.totalItemsSold].map(escapeCsvCell).join(",")
  );
  rows.push("");
  rows.push("Por método de pago");
  rows.push("Medio,Cant. ventas,Total");
  for (const row of detail.byPaymentMethod) {
    rows.push(
      [PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod, row.count, Number(row.totalAmount).toFixed(2)].map(escapeCsvCell).join(",")
    );
  }
  rows.push("");
  rows.push("Top productos");
  rows.push("Producto,SKU,Talle,Color,Cant. vendida,Ingresos");
  for (const row of detail.topProducts) {
    rows.push(
      [
        row.product?.name ?? "—",
        row.sku,
        row.size,
        row.color,
        row.quantitySold,
        Number(row.revenue).toFixed(2),
      ].map(escapeCsvCell).join(",")
    );
  }
  rows.push("");
  rows.push("Ventas por día");
  rows.push("Fecha,Cant. ventas,Total");
  for (const row of detail.salesByDay) {
    rows.push([row.date, row.count, Number(row.totalAmount).toFixed(2)].map(escapeCsvCell).join(","));
  }
  const csv = "\uFEFF" + rows.join("\r\n"); // BOM for Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-${from}-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportReportToPdf(detail: ReportDetail, from: string, to: string) {
  type DocWithTable = jsPDF & { autoTable: (opts: Record<string, unknown>) => jsPDF; lastAutoTable?: { finalY: number } };
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as DocWithTable;
  let y = 12;

  doc.setFontSize(16);
  doc.text("Reporte de ventas", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Período: ${from} a ${to}`, 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.text("Resumen del período", 14, y);
  y += 6;
  doc.autoTable({
    head: [["Ventas", "Ingresos", "Ítems vendidos"]],
    body: [[
      String(detail.summary.totalSales),
      `$${Number(detail.summary.totalRevenue).toFixed(2)}`,
      String(detail.summary.totalItemsSold),
    ]],
    startY: y,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [100, 116, 139] },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  doc.setFontSize(11);
  doc.text("Por método de pago", 14, y);
  y += 6;
  doc.autoTable({
    head: [["Medio", "Cant. ventas", "Total"]],
    body: detail.byPaymentMethod.map((row) => [
      PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod,
      String(row.count),
      `$${Number(row.totalAmount).toFixed(2)}`,
    ]),
    startY: y,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [100, 116, 139] },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  doc.setFontSize(11);
  doc.text("Top productos", 14, y);
  y += 6;
  doc.autoTable({
    head: [["Producto", "SKU", "Talle", "Color", "Cant. vendida", "Ingresos"]],
    body: detail.topProducts.map((row) => [
      row.product?.name ?? "—",
      row.sku,
      row.size,
      row.color,
      String(row.quantitySold),
      `$${Number(row.revenue).toFixed(2)}`,
    ]),
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 116, 139] },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  doc.setFontSize(11);
  doc.text("Ventas por día", 14, y);
  y += 6;
  doc.autoTable({
    head: [["Fecha", "Cant. ventas", "Total"]],
    body: detail.salesByDay.map((row) => [
      row.date,
      String(row.count),
      `$${Number(row.totalAmount).toFixed(2)}`,
    ]),
    startY: y,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [100, 116, 139] },
  });

  doc.save(`reporte-${from}-${to}.pdf`);
}

function exportNoMovementToCsv(rows: NoMovementRow[], days: number) {
  const header = ["Producto", "Variante", "SKU", "Sucursal", "Cantidad", "Último movimiento"];
  const body = rows.map((r) => [
    r.productName,
    r.variantLabel,
    r.sku,
    r.branchName,
    r.quantity,
    r.lastMovementAt ? new Date(r.lastMovementAt).toLocaleString("es-AR") : "Nunca",
  ]);
  const csv = "\uFEFF" + [header.map(escapeCsvCell).join(","), ...body.map((row) => row.map(escapeCsvCell).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `productos-sin-movimiento-${days}-dias.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { canViewReports } = useAuth();
  const [quickOverview, setQuickOverview] = useState<Overview | null>(null);
  const [quickLoading, setQuickLoading] = useState(true);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayISO);
  const [paymentSortKey, setPaymentSortKey] = useState<string | null>(null);
  const [paymentSortDir, setPaymentSortDir] = useState<"asc" | "desc">("asc");
  const [topSortKey, setTopSortKey] = useState<string | null>(null);
  const [topSortDir, setTopSortDir] = useState<"asc" | "desc">("asc");
  const [daySortKey, setDaySortKey] = useState<string | null>(null);
  const [daySortDir, setDaySortDir] = useState<"asc" | "desc">("asc");
  const [previousPeriod, setPreviousPeriod] = useState<ReportDetail | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [noMovementDays, setNoMovementDays] = useState(30);
  const [noMovementBranchId, setNoMovementBranchId] = useState<number | "">("");
  const [noMovementLoading, setNoMovementLoading] = useState(false);
  const [noMovementData, setNoMovementData] = useState<NoMovementRow[] | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string; code: string }[]>([]);
  const { showToast } = useToast();

  const chartIngresosDiaRef = useRef<HTMLDivElement>(null);
  const chartPagoPieRef = useRef<HTMLDivElement>(null);
  const chartPagoBarRef = useRef<HTMLDivElement>(null);
  const chartCategoriaRef = useRef<HTMLDivElement>(null);

  const handleExportChartsPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      await exportChartsToPdf([
        { ref: chartIngresosDiaRef, title: "Ingresos por día" },
        { ref: chartPagoPieRef, title: "Ingresos por medio de pago" },
        { ref: chartPagoBarRef, title: "Ventas por medio de pago" },
        { ref: chartCategoriaRef, title: "Ventas por categoría" },
      ]);
      showToast("Gráficos exportados a PDF.");
    } catch {
      showToast("Error al exportar PDF.", "error");
    } finally {
      setExportingPdf(false);
    }
  }, [showToast]);

  const loadQuickReport = useCallback(() => {
    const today = todayISO();
    setQuickLoading(true);
    authFetch(
      `${API_BASE_URL}/analytics/overview?from=${today}&to=${today}`,
      { headers: authHeaders() }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setQuickOverview(data))
      .catch(() => setQuickOverview(null))
      .finally(() => setQuickLoading(false));
  }, []);

  const loadDetailReport = useCallback(() => {
    if (!from || !to || from > to) {
      setDetailError("Elegí un rango de fechas válido (desde ≤ hasta).");
      return;
    }
    setDetailError(null);
    setDetailLoading(true);
    setPreviousPeriod(null);
    const fromDate = new Date(from + "T12:00:00");
    const toDate = new Date(to + "T12:00:00");
    const daysDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const toPrev = new Date(fromDate);
    toPrev.setDate(toPrev.getDate() - 1);
    const fromPrev = new Date(toPrev);
    fromPrev.setDate(fromPrev.getDate() - daysDiff + 1);
    const fromPrevStr = fromPrev.toISOString().slice(0, 10);
    const toPrevStr = toPrev.toISOString().slice(0, 10);

    Promise.all([
      authFetch(`${API_BASE_URL}/analytics/report-detail?from=${from}&to=${to}`, { headers: authHeaders() }),
      authFetch(`${API_BASE_URL}/analytics/report-detail?from=${fromPrevStr}&to=${toPrevStr}`, { headers: authHeaders() }),
    ])
      .then(([resCur, resPrev]) => {
        if (!resCur.ok) throw new Error("Error al cargar el reporte");
        return Promise.all([resCur.json(), resPrev.ok ? resPrev.json() : null]);
      })
      .then(([data, prev]) => {
        setDetail(data);
        setPreviousPeriod(prev ?? null);
      })
      .catch((e) => {
        setDetailError(e instanceof Error ? e.message : "Error");
        setDetail(null);
      })
      .finally(() => setDetailLoading(false));
  }, [from, to]);

  useEffect(() => {
    loadQuickReport();
  }, [loadQuickReport]);

  useEffect(() => {
    authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]));
  }, []);

  const loadNoMovementReport = useCallback(() => {
    setNoMovementLoading(true);
    setNoMovementData(null);
    const params = new URLSearchParams({ days: String(noMovementDays) });
    if (noMovementBranchId !== "") params.set("branchId", String(noMovementBranchId));
    authFetch(`${API_BASE_URL}/analytics/products-without-movement?${params}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNoMovementData(Array.isArray(data) ? data : []))
      .catch(() => {
        setNoMovementData([]);
        showToast("Error al cargar el reporte.", "error");
      })
      .finally(() => setNoMovementLoading(false));
  }, [noMovementDays, noMovementBranchId, showToast]);

  if (!canViewReports) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Reportes</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Resumen del día y análisis por período.</p>
      </div>

      <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Resumen de hoy</h3>
          <button
            type="button"
            onClick={loadQuickReport}
            disabled={quickLoading}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
          >
            {quickLoading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
        <div className="p-5">
          {quickLoading ? (
            <div className="py-2">
              <SkeletonReportCards />
            </div>
          ) : quickOverview ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 border border-emerald-100 dark:border-emerald-800 p-4">
                <p className="text-xs font-medium text-emerald-700/80 dark:text-emerald-300 uppercase tracking-wider">Ventas hoy</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-200">{quickOverview.totalSales}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">operaciones</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 border border-indigo-100 dark:border-indigo-800 p-4">
                <p className="text-xs font-medium text-indigo-700/80 dark:text-indigo-300 uppercase tracking-wider">Ingresos hoy</p>
                <p className="mt-1 text-2xl font-bold text-indigo-800 dark:text-indigo-200">
                  ${Number(quickOverview.totalRevenue).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">total del día</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Ítems vendidos</p>
                <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{quickOverview.totalItemsSold}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">unidades hoy</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Productos en catálogo</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-700 dark:text-slate-200">{quickOverview.productsCount ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Variantes</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-700 dark:text-slate-200">{quickOverview.variantsCount ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Stock total</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-700 dark:text-slate-200">{quickOverview.totalStockUnits ?? 0} u.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">Sin ventas hoy.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Reporte por período</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Elegí un rango de fechas para ver ventas, medios de pago y top productos.</p>
        </div>
        <div className="p-5 space-y-5">
          {/* Grupo: Rango de fechas */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Rango de fechas</p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Desde</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="input-minimal w-[140px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Hasta</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="input-minimal w-[140px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["7", "30", "month", "lastMonth"] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const { from: f, to: t } = getDateRangePreset(preset);
                      setFrom(f);
                      setTo(t);
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                  >
                    {preset === "7" ? "Últimos 7 días" : preset === "30" ? "Últimos 30 días" : preset === "month" ? "Este mes" : "Mes pasado"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Acción principal */}
          {from && to && from > to && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              La fecha Desde debe ser anterior o igual a Hasta.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadDetailReport}
              disabled={detailLoading || !from || !to || from > to}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <IconChart />
              {detailLoading ? "Cargando…" : "Ver reporte"}
            </button>
            {detail && !detailLoading && (
              <span className="text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-600 pl-3">
                Descargar:
              </span>
            )}
            {detail && !detailLoading && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportReportToCsv(detail, from, to);
                    showToast("Reporte exportado en CSV.");
                  }}
                  className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportReportToPdf(detail, from, to);
                    showToast("Reporte exportado en PDF.");
                  }}
                  className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Exportar PDF
                </button>
              </div>
            )}
          </div>

          {detailError && (
            <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>
          )}

        {detail && !detailLoading && (() => {
          const sortedPayment = sortByColumn(
            detail.byPaymentMethod,
            paymentSortKey,
            paymentSortDir,
            (row, k) => (k === "medio" ? (PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod) : k === "count" ? row.count : Number(row.totalAmount))
          );
          const sortedTop = sortByColumn(
            detail.topProducts,
            topSortKey,
            topSortDir,
            (row, k) => {
              if (k === "product") return row.product?.name ?? row.sku;
              if (k === "talle") return `${row.size} ${row.color}`;
              if (k === "cant") return row.quantitySold;
              if (k === "ingresos") return row.revenue;
              return "";
            }
          );
          const sortedDay = sortByColumn(
            detail.salesByDay,
            daySortKey,
            daySortDir,
            (row, k) => (k === "date" ? row.date : k === "count" ? row.count : Number(row.totalAmount))
          );
          const ticketPromedio =
              detail.summary.totalSales > 0
                ? Number(detail.summary.totalRevenue) / detail.summary.totalSales
                : 0;
            const prev = previousPeriod?.summary;
            const pctVentas = prev ? percentChange(detail.summary.totalSales, prev.totalSales) : null;
            const pctIngresos = prev ? percentChange(Number(detail.summary.totalRevenue), Number(prev.totalRevenue)) : null;
            const pctItems = prev ? percentChange(detail.summary.totalItemsSold, prev.totalItemsSold) : null;
            const bestDay = detail.salesByDay.length > 0
              ? detail.salesByDay.reduce((best, d) => (Number(d.totalAmount) > Number(best.totalAmount) ? d : best), detail.salesByDay[0])
              : null;
            const chartSalesByDay = detail.salesByDay.map((d) => ({
              fecha: new Date(d.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
              ingresos: Number(d.totalAmount),
              ventas: d.count,
            }));
            const chartPayment = detail.byPaymentMethod.map((row, i) => ({
              name: PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod,
              value: Number(row.totalAmount),
              count: row.count,
              fill: CHART_COLORS[i % CHART_COLORS.length],
            }));

            return (
          <div className="space-y-8 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Reporte: {formatReportDate(from)} – {formatReportDate(to)}
              </h4>
              <button
                type="button"
                onClick={handleExportChartsPdf}
                disabled={exportingPdf}
                className="btn-secondary text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50"
              >
                {exportingPdf ? "Exportando…" : "Exportar gráficos a PDF"}
              </button>
            </div>

            {/* Comparativa con período anterior */}
            {previousPeriod && (() => {
              const fromDate = new Date(from + "T12:00:00");
              const toDate = new Date(to + "T12:00:00");
              const daysDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
              const toPrev = new Date(fromDate);
              toPrev.setDate(toPrev.getDate() - 1);
              const fromPrev = new Date(toPrev);
              fromPrev.setDate(fromPrev.getDate() - daysDiff + 1);
              const prev = previousPeriod.summary;
              const comparisonData = [
                { name: "Ventas (operaciones)", Actual: detail.summary.totalSales, Anterior: prev.totalSales },
                { name: "Ingresos ($)", Actual: Math.round(Number(detail.summary.totalRevenue)), Anterior: Math.round(Number(prev.totalRevenue)) },
              ];
              return (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 p-5">
                  <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Comparativa con período anterior</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Mismo número de días inmediatamente anteriores al rango elegido.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Período seleccionado</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatReportDate(from)} – {formatReportDate(to)}</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong>{detail.summary.totalSales}</strong> ventas {pctVentas != null && <span className={pctVentas >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}> ({pctVentas >= 0 ? "+" : ""}{pctVentas}% vs anterior)</span>}</li>
                        <li><strong>${Number(detail.summary.totalRevenue).toFixed(2)}</strong> ingresos {pctIngresos != null && <span className={pctIngresos >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}> ({pctIngresos >= 0 ? "+" : ""}{pctIngresos}% vs anterior)</span>}</li>
                        <li><strong>{detail.summary.totalItemsSold}</strong> ítems vendidos {pctItems != null && <span className={pctItems >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}> ({pctItems >= 0 ? "+" : ""}{pctItems}% vs anterior)</span>}</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Período anterior</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{fromPrev.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })} – {toPrev.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong>{prev.totalSales}</strong> ventas</li>
                        <li><strong>${Number(prev.totalRevenue).toFixed(2)}</strong> ingresos</li>
                        <li><strong>{prev.totalItemsSold}</strong> ítems vendidos</li>
                      </ul>
                    </div>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="Actual" fill="#6366f1" name="Período seleccionado" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Anterior" fill="#94a3b8" name="Período anterior" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* Resumen del período */}
            <div>
              <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Resumen del período</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs text-slate-500">Ventas</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{detail.summary.totalSales}</p>
                  {pctVentas !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${pctVentas >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {pctVentas >= 0 ? "↑" : "↓"} {Math.abs(pctVentas)}% vs período anterior
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                  <p className="text-xs text-emerald-700/80">Ingresos</p>
                  <p className="mt-1 text-xl font-bold text-emerald-800">
                    ${Number(detail.summary.totalRevenue).toFixed(2)}
                  </p>
                  {pctIngresos !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${pctIngresos >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {pctIngresos >= 0 ? "↑" : "↓"} {Math.abs(pctIngresos)}% vs período anterior
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs text-slate-500">Ítems vendidos</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{detail.summary.totalItemsSold}</p>
                  {pctItems !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${pctItems >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {pctItems >= 0 ? "↑" : "↓"} {Math.abs(pctItems)}% vs período anterior
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3">
                  <p className="text-xs text-indigo-700/80">Ticket promedio</p>
                  <p className="mt-1 text-xl font-bold text-indigo-800">${ticketPromedio.toFixed(2)}</p>
                </div>
                {bestDay && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                    <p className="text-xs text-amber-700/80">Mejor día</p>
                    <p className="mt-1 text-lg font-bold text-amber-800">
                      {new Date(bestDay.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs font-medium text-amber-700">${Number(bestDay.totalAmount).toFixed(2)} · {bestDay.count} ventas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico ventas por día */}
            {chartSalesByDay.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ingresos por día</h5>
                  <button
                    type="button"
                    onClick={() => exportChartAsPng(chartIngresosDiaRef.current, "ingresos-por-dia.png")}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    Descargar PNG
                  </button>
                </div>
                <div ref={chartIngresosDiaRef} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartSalesByDay} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
                      <RechartsTooltip
                        formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Ingresos"]}
                        labelFormatter={(label) => label}
                      />
                      <Area type="monotone" dataKey="ingresos" stroke="#6366f1" strokeWidth={2} fill="url(#colorIngresos)" name="Ingresos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Gráfico métodos de pago */}
            {chartPayment.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ingresos por medio de pago</h5>
                    <button type="button" onClick={() => exportChartAsPng(chartPagoPieRef.current, "ingresos-por-medio-pago.png")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Descargar PNG</button>
                  </div>
                  <div ref={chartPagoPieRef} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartPayment}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, value }) => `${name}: $${Number(value).toFixed(0)}`}
                        >
                          {chartPayment.map((_, i) => (
                            <Cell key={i} fill={chartPayment[i].fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Total"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cantidad de ventas por medio</h5>
                    <button type="button" onClick={() => exportChartAsPng(chartPagoBarRef.current, "ventas-por-medio.png")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Descargar PNG</button>
                  </div>
                  <div ref={chartPagoBarRef} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartPayment} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Ventas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {detail.salesByCategory && detail.salesByCategory.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas por categoría</h5>
                  <button type="button" onClick={() => exportChartAsPng(chartCategoriaRef.current, "ventas-por-categoria.png")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Descargar PNG</button>
                </div>
                <div ref={chartCategoriaRef} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={detail.salesByCategory.map((r, i) => ({ ...r, fill: CHART_COLORS[i % CHART_COLORS.length] }))} margin={{ top: 8, right: 8, left: 8, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="category" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                          <RechartsTooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, "Ingresos"]} />
                          <Bar dataKey="revenue" name="Ingresos" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="table-modern">
                      <table>
                        <thead>
                          <tr>
                            <th className="text-left font-medium">Categoría</th>
                            <th className="text-right font-medium">Ingresos</th>
                            <th className="text-right font-medium">Unid.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.salesByCategory.map((row) => (
                            <tr key={row.category}>
                              <td>{row.category}</td>
                              <td className="text-right font-medium">${Number(row.revenue).toFixed(2)}</td>
                              <td className="text-right text-slate-500 dark:text-slate-400">{row.quantitySold}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Detalle por método de pago</h5>
              <div className="table-modern">
                <table>
                  <thead>
                    <tr>
                      <TableSortHeader label="Medio" sortKey="medio" currentSortKey={paymentSortKey} currentSortDir={paymentSortDir} onSort={(k) => { setPaymentSortKey(k); setPaymentSortDir((d) => paymentSortKey === k && d === "asc" ? "desc" : "asc"); }} />
                      <TableSortHeader label="Cant. ventas" sortKey="count" currentSortKey={paymentSortKey} currentSortDir={paymentSortDir} onSort={(k) => { setPaymentSortKey(k); setPaymentSortDir((d) => paymentSortKey === k && d === "asc" ? "desc" : "asc"); }} />
                      <TableSortHeader label="Total" sortKey="total" currentSortKey={paymentSortKey} currentSortDir={paymentSortDir} onSort={(k) => { setPaymentSortKey(k); setPaymentSortDir((d) => paymentSortKey === k && d === "asc" ? "desc" : "asc"); }} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPayment.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-slate-500 dark:text-slate-400 py-8">
                          Sin datos en el período.
                        </td>
                      </tr>
                    ) : (
                      sortedPayment.map((row) => (
                        <tr key={row.paymentMethod}>
                          <td>{PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod}</td>
                          <td>{row.count}</td>
                          <td className="font-medium">${Number(row.totalAmount).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Top productos del período</h5>
              <div className="table-modern">
                <table>
                  <thead>
                    <tr>
                      <TableSortHeader label="Producto / SKU" sortKey="product" currentSortKey={topSortKey} currentSortDir={topSortDir} onSort={(k) => { setTopSortKey(k); setTopSortDir((d) => topSortKey === k && d === "asc" ? "desc" : "asc"); }} />
                      <TableSortHeader label="Talle / Color" sortKey="talle" currentSortKey={topSortKey} currentSortDir={topSortDir} onSort={(k) => { setTopSortKey(k); setTopSortDir((d) => topSortKey === k && d === "asc" ? "desc" : "asc"); }} />
                      <TableSortHeader label="Cant." sortKey="cant" currentSortKey={topSortKey} currentSortDir={topSortDir} onSort={(k) => { setTopSortKey(k); setTopSortDir((d) => topSortKey === k && d === "asc" ? "desc" : "asc"); }} />
                      <TableSortHeader label="Ingresos" sortKey="ingresos" currentSortKey={topSortKey} currentSortDir={topSortDir} onSort={(k) => { setTopSortKey(k); setTopSortDir((d) => topSortKey === k && d === "asc" ? "desc" : "asc"); }} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTop.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-slate-500 dark:text-slate-400 py-8">
                          Sin ventas en el período.
                        </td>
                      </tr>
                    ) : (
                      sortedTop.map((row) => (
                        <tr key={row.productVariantId}>
                          <td>{row.product?.name ?? "—"} ({row.sku})</td>
                          <td>{row.size} / {row.color}</td>
                          <td>{row.quantitySold}</td>
                          <td>${Number(row.revenue).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Ventas por día (detalle)</h5>
              <div className="table-modern">
                <table>
                  <thead>
                    <tr>
                      <TableSortHeader label="Fecha" sortKey="date" currentSortKey={daySortKey} currentSortDir={daySortDir} onSort={(k) => { setDaySortKey(k); setDaySortDir((d) => daySortKey === k && d === "asc" ? "desc" : "asc"); }} />
                      <TableSortHeader label="Ventas" sortKey="count" currentSortKey={daySortKey} currentSortDir={daySortDir} onSort={(k) => { setDaySortKey(k); setDaySortDir((d) => daySortKey === k && d === "asc" ? "desc" : "asc"); }} />
                      <TableSortHeader label="Total" sortKey="total" currentSortKey={daySortKey} currentSortDir={daySortDir} onSort={(k) => { setDaySortKey(k); setDaySortDir((d) => daySortKey === k && d === "asc" ? "desc" : "asc"); }} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDay.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-slate-500 dark:text-slate-400 py-8">
                          Sin datos.
                        </td>
                      </tr>
                    ) : (
                      sortedDay.map((row) => (
                        <tr key={row.date}>
                          <td>{new Date(row.date + "T12:00:00").toLocaleDateString()}</td>
                          <td>{row.count}</td>
                          <td>${Number(row.totalAmount).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

          {!detail && !detailLoading && !detailError && (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">
                Elegí un rango de fechas y hacé clic en &quot;Ver reporte&quot; para ver gráficos y tablas.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Productos sin movimiento</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Productos en inventario que no tuvieron ningún movimiento (venta, ajuste, traspaso) en la cantidad de días indicada.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Últimos días sin movimiento</label>
              <input
                type="number"
                min={1}
                max={365}
                value={noMovementDays}
                onChange={(e) => setNoMovementDays(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 30)))}
                className="input-minimal w-24 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Sucursal</label>
              <select
                value={noMovementBranchId === "" ? "" : noMovementBranchId}
                onChange={(e) => setNoMovementBranchId(e.target.value === "" ? "" : Number(e.target.value))}
                className="input-minimal w-48 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              >
                <option value="">Todas</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={loadNoMovementReport}
              disabled={noMovementLoading}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <IconChart />
              {noMovementLoading ? "Cargando…" : "Generar reporte"}
            </button>
            {noMovementData && noMovementData.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  exportNoMovementToCsv(noMovementData, noMovementDays);
                  showToast("Reporte exportado en CSV.");
                }}
                className="btn-secondary text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                Exportar CSV
              </button>
            )}
          </div>
          {noMovementData && (
            <div className="table-modern">
              <table>
                <thead>
                  <tr>
                    <th className="text-left font-medium">Producto</th>
                    <th className="text-left font-medium">Variante</th>
                    <th className="text-left font-medium">SKU</th>
                    <th className="text-left font-medium">Sucursal</th>
                    <th className="text-right font-medium">Cantidad</th>
                    <th className="text-left font-medium">Último movimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {noMovementData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-8">
                        No hay productos sin movimiento en los últimos {noMovementDays} días.
                      </td>
                    </tr>
                  ) : (
                    noMovementData.map((row) => (
                      <tr key={`${row.branchId}-${row.productVariantId}`}>
                        <td>{row.productName}</td>
                        <td>{row.variantLabel}</td>
                        <td className="font-mono text-xs">{row.sku}</td>
                        <td>{row.branchName}</td>
                        <td className="text-right">{row.quantity}</td>
                        <td className="text-slate-500 dark:text-slate-400 text-sm">
                          {row.lastMovementAt ? new Date(row.lastMovementAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "Nunca"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
