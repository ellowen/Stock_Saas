import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../../lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
} from "recharts";
import type { ReportDetail } from "../hooks/useReports";

function formatReportDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

interface Props {
  from: string;
  to: string;
  detail: ReportDetail;
  previousPeriod: ReportDetail;
}

export function PeriodComparison({ from, to, detail, previousPeriod }: Props) {
  const { t } = useTranslation();
  const fromDate = new Date(from + "T12:00:00");
  const toDate = new Date(to + "T12:00:00");
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  const toPrev = new Date(fromDate); toPrev.setDate(toPrev.getDate() - 1);
  const fromPrev = new Date(toPrev); fromPrev.setDate(fromPrev.getDate() - days + 1);

  const prev = previousPeriod.summary;
  const pctVentas = percentChange(detail.summary.totalSales, prev.totalSales);
  const pctIngresos = percentChange(Number(detail.summary.totalRevenue), Number(prev.totalRevenue));
  const pctItems = percentChange(detail.summary.totalItemsSold, prev.totalItemsSold);

  const comparisonData = [
    { name: t("reports.sales"), Actual: detail.summary.totalSales, Anterior: prev.totalSales },
    { name: t("reports.revenue"), Actual: Math.round(Number(detail.summary.totalRevenue)), Anterior: Math.round(Number(prev.totalRevenue)) },
  ];

  function Pct({ v }: { v: number | null }) {
    if (v === null) return null;
    return (
      <span className={v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
        {" "}{t("reports.vsPreviousPct", { pct: (v >= 0 ? "+" : "") + v })}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 p-5">
      <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{t("reports.periodCompTitle")}</h5>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        {t("reports.periodCompSubtitle")}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t("reports.selectedPeriod")}</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {formatReportDate(from)} – {formatReportDate(to)}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <li><strong>{detail.summary.totalSales}</strong> {t("reports.salesCount")}<Pct v={pctVentas} /></li>
            <li><strong>{formatCurrency(detail.summary.totalRevenue)}</strong> {t("reports.revenueLabel")}<Pct v={pctIngresos} /></li>
            <li><strong>{detail.summary.totalItemsSold}</strong> {t("reports.itemsSoldLabel")}<Pct v={pctItems} /></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t("reports.previousPeriod")}</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {fromPrev.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })} – {toPrev.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <li><strong>{prev.totalSales}</strong> {t("reports.salesCount")}</li>
            <li><strong>{formatCurrency(prev.totalRevenue)}</strong> {t("reports.revenueLabel")}</li>
            <li><strong>{prev.totalItemsSold}</strong> {t("reports.itemsSoldLabel")}</li>
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
            <Bar dataKey="Actual" fill="#6366f1" name={t("reports.selectedPeriod")} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Anterior" fill="#94a3b8" name={t("reports.previousPeriod")} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
