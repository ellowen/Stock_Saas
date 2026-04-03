import { useTranslation } from "react-i18next";
import { IconChart } from "../../../components/Icons";
import type { NoMovementRow } from "../hooks/useReports";

interface Branch {
  id: number;
  name: string;
  code: string;
}

interface Props {
  days: number;
  onDaysChange: (v: number) => void;
  branchId: number | "";
  onBranchChange: (v: number | "") => void;
  branches: Branch[];
  loading: boolean;
  data: NoMovementRow[] | null;
  onLoad: () => void;
  onExport: () => void;
}

export function NoMovementReport({
  days, onDaysChange, branchId, onBranchChange, branches,
  loading, data, onLoad, onExport,
}: Props) {
  const { t } = useTranslation();
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t("reports.noMovementTitle")}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t("reports.noMovementSubtitle")}
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t("reports.noMovementDaysLabel")}</label>
            <input
              type="number" min={1} max={365} value={days}
              onChange={(e) => onDaysChange(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 30)))}
              className="input-minimal w-24 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t("reports.noMovementBranchLabel")}</label>
            <select
              value={branchId === "" ? "" : branchId}
              onChange={(e) => onBranchChange(e.target.value === "" ? "" : Number(e.target.value))}
              className="input-minimal w-48 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="">{t("reports.allBranches")}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button
            type="button" onClick={onLoad} disabled={loading}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <IconChart />
            {loading ? t("reports.loading") : t("reports.generateReport")}
          </button>
          {data && data.length > 0 && (
            <button type="button" onClick={onExport} className="btn-secondary text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
              {t("reports.exportCsvBtn")}
            </button>
          )}
        </div>
        {data && (
          <div className="table-modern">
            <table>
              <thead>
                <tr>
                  <th className="text-left font-medium">{t("reports.noMovementColProduct")}</th>
                  <th className="text-left font-medium">{t("reports.noMovementColVariant")}</th>
                  <th className="text-left font-medium">{t("reports.noMovementColSku")}</th>
                  <th className="text-left font-medium">{t("reports.noMovementColBranch")}</th>
                  <th className="text-right font-medium">{t("reports.noMovementColQty")}</th>
                  <th className="text-left font-medium">{t("reports.noMovementColLastMovement")}</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-8">
                      {t("reports.noMovementEmpty", { days })}
                    </td>
                  </tr>
                ) : data.map((row) => (
                  <tr key={`${row.branchId}-${row.productVariantId}`}>
                    <td>{row.productName}</td>
                    <td>{row.variantLabel}</td>
                    <td className="font-mono text-xs">{row.sku}</td>
                    <td>{row.branchName}</td>
                    <td className="text-right">{row.quantity}</td>
                    <td className="text-slate-500 dark:text-slate-400 text-sm">
                      {row.lastMovementAt
                        ? new Date(row.lastMovementAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
                        : t("reports.noMovementNever")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
