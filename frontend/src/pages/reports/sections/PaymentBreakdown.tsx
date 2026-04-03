import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend,
} from "recharts";
import html2canvas from "html2canvas";
import { TableSortHeader, sortByColumn } from "../../../components/TableSortHeader";
import { PAYMENT_METHOD_KEYS } from "../../sales/types";

const CHART_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#64748b"];

interface PaymentRow {
  paymentMethod: string;
  count: number;
  totalAmount: number;
}

interface Props {
  data: PaymentRow[];
}

async function exportChartAsPng(element: HTMLElement | null, filename: string) {
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
}

export function PaymentBreakdown({ data }: Props) {
  const { t } = useTranslation();
  const pieRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  if (data.length === 0) return null;

  const chartData = data.map((row, i) => ({
    name: PAYMENT_METHOD_KEYS[row.paymentMethod] ? t(PAYMENT_METHOD_KEYS[row.paymentMethod]) : row.paymentMethod,
    value: Number(row.totalAmount),
    count: row.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const sorted = sortByColumn(data, sortKey, sortDir, (row, k) => {
    if (k === "medio") return PAYMENT_METHOD_KEYS[row.paymentMethod] ? t(PAYMENT_METHOD_KEYS[row.paymentMethod]) : row.paymentMethod;
    if (k === "count") return row.count;
    return Number(row.totalAmount);
  });

  function handleSort(k: string) {
    setSortDir((d) => sortKey === k && d === "asc" ? "desc" : "asc");
    setSortKey(k);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("reports.ingresosByPayment")}</h5>
            <button type="button" onClick={() => exportChartAsPng(pieRef.current, "ingresos-por-medio-pago.png")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">{t("reports.downloadPng")}</button>
          </div>
          <div ref={pieRef} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: $${Number(value).toFixed(0)}`}>
                  {chartData.map((_, i) => <Cell key={i} fill={chartData[i].fill} />)}
                </Pie>
                <RechartsTooltip formatter={(value: number) => [`$${Number(value).toFixed(2)}`, t("reports.colTotal")]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("reports.salesByPayment")}</h5>
            <button type="button" onClick={() => exportChartAsPng(barRef.current, "ventas-por-medio.png")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">{t("reports.downloadPng")}</button>
          </div>
          <div ref={barRef} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name={t("reports.sales")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t("reports.paymentDetail")}</h5>
        <div className="table-modern">
          <table>
            <thead>
              <tr>
                <TableSortHeader label={t("reports.colPaymentMethod")} sortKey="medio" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                <TableSortHeader label={t("reports.colSalesCount")} sortKey="count" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                <TableSortHeader label={t("reports.colTotal")} sortKey="total" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-slate-500 dark:text-slate-400 py-8">{t("reports.noDataPeriod")}</td></tr>
              ) : sorted.map((row) => (
                <tr key={row.paymentMethod}>
                  <td>{PAYMENT_METHOD_KEYS[row.paymentMethod] ? t(PAYMENT_METHOD_KEYS[row.paymentMethod]) : row.paymentMethod}</td>
                  <td>{row.count}</td>
                  <td className="font-medium">${Number(row.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
