import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from "recharts";
import html2canvas from "html2canvas";
import { TableSortHeader, sortByColumn } from "../../../components/TableSortHeader";
import type { ReportDetail } from "../hooks/useReports";

const CHART_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#64748b"];

interface Props {
  topProducts: ReportDetail["topProducts"];
  salesByCategory?: ReportDetail["salesByCategory"];
}

async function exportChartAsPng(element: HTMLElement | null, filename: string) {
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
}

export function TopProducts({ topProducts, salesByCategory }: Props) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const catRef = useRef<HTMLDivElement>(null);

  function handleSort(k: string) {
    setSortDir((d) => sortKey === k && d === "asc" ? "desc" : "asc");
    setSortKey(k);
  }

  const sorted = sortByColumn(topProducts, sortKey, sortDir, (row, k) => {
    if (k === "product") return row.product?.name ?? row.sku;
    if (k === "variant") return row.variantLabel ?? "";
    if (k === "cant") return row.quantitySold;
    if (k === "ingresos") return row.revenue;
    return "";
  });

  return (
    <div className="space-y-6">
      <div>
        <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t("reports.topProductsTitle")}</h5>
        <div className="table-modern">
          <table>
            <thead>
              <tr>
                <TableSortHeader label={t("reports.colProductSku")} sortKey="product" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                <TableSortHeader label={t("reports.colVariant")} sortKey="variant" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                <TableSortHeader label={t("reports.colQty")} sortKey="cant" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                <TableSortHeader label={t("reports.colRevenue")} sortKey="ingresos" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-slate-500 dark:text-slate-400 py-8">{t("reports.noSalesPeriod")}</td></tr>
              ) : sorted.map((row) => (
                <tr key={row.productVariantId}>
                  <td>{row.product?.name ?? "—"} <span className="font-mono text-xs text-slate-400">({row.sku})</span></td>
                  <td className="text-sm">{row.variantLabel ?? "—"}</td>
                  <td>{row.quantitySold}</td>
                  <td className="font-medium">${Number(row.revenue).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {salesByCategory && salesByCategory.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("reports.salesByCategory")}</h5>
            <button type="button" onClick={() => exportChartAsPng(catRef.current, "ventas-por-categoria.png")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">{t("reports.downloadPng")}</button>
          </div>
          <div ref={catRef} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={salesByCategory.map((r, i) => ({ ...r, fill: CHART_COLORS[i % CHART_COLORS.length] }))}
                    margin={{ top: 8, right: 8, left: 8, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="category" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <RechartsTooltip formatter={(v: number | undefined) => [`$${Number(v ?? 0).toFixed(2)}`, t("reports.revenue")]} />
                    <Bar dataKey="revenue" name={t("reports.revenue")} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-modern">
                <table>
                  <thead>
                    <tr>
                      <th className="text-left font-medium">{t("reports.colCategory")}</th>
                      <th className="text-right font-medium">{t("reports.colRevenue")}</th>
                      <th className="text-right font-medium">{t("reports.colUnits")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByCategory.map((row) => (
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
    </div>
  );
}
