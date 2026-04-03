import { useTranslation } from "react-i18next";
import { SkeletonReportCards } from "../../../components/Skeleton";
import type { Overview } from "../hooks/useReports";

interface Props {
  overview: Overview | null;
  loading: boolean;
  onRefresh: () => void;
}

export function SalesSummary({ overview, loading, onRefresh }: Props) {
  const { t } = useTranslation();
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t("reports.todaySummaryTitle")}</h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
        >
          {loading ? t("reports.refreshing") : t("reports.refresh")}
        </button>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="py-2"><SkeletonReportCards /></div>
        ) : overview ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 border border-emerald-100 dark:border-emerald-800 p-4">
              <p className="text-xs font-medium text-emerald-700/80 dark:text-emerald-300 uppercase tracking-wider">{t("reports.salesToday")}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-200">{overview.totalSales}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("reports.operations")}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 border border-indigo-100 dark:border-indigo-800 p-4">
              <p className="text-xs font-medium text-indigo-700/80 dark:text-indigo-300 uppercase tracking-wider">{t("reports.revenueToday")}</p>
              <p className="mt-1 text-2xl font-bold text-indigo-800 dark:text-indigo-200">
                ${Number(overview.totalRevenue).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("reports.totalDay")}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t("reports.itemsSold")}</p>
              <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{overview.totalItemsSold}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("reports.unitsToday")}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("reports.productsCatalog")}</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-700 dark:text-slate-200">{overview.productsCount ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("reports.variants")}</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-700 dark:text-slate-200">{overview.variantsCount ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("reports.totalStock")}</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-700 dark:text-slate-200">{overview.totalStockUnits ?? 0} u.</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4">{t("reports.noSalesToday")}</p>
        )}
      </div>
    </section>
  );
}
