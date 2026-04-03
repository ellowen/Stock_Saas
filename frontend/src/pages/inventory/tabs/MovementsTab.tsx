import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pagination } from "../../../components/Pagination";
import { MOVEMENT_TYPE_LABELS } from "../types";
import type { Branch, MovementsPaginated } from "../types";

type Props = {
  result: MovementsPaginated | null;
  loading: boolean;
  page: number;
  setPage: (p: number) => void;
  branchId: string;
  setBranchId: (v: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  load: (p?: number) => void;
  branches: Branch[];
};

export function MovementsTab({
  result,
  loading,
  page,
  setPage,
  branchId,
  setBranchId,
  from,
  setFrom,
  to,
  setTo,
  load,
  branches,
}: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    load(page);
  }, [page, load]);

  return (
    <section>
      <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {t("inventory.movementsTitle")}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {t("inventory.movementsSubtitle")}
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("inventory.filters.branch")}
          </label>
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            className="input-minimal min-w-[180px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">{t("inventory.allBranchesOption")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("inventory.fromLabel")}
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="input-minimal dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("inventory.toLabel")}
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="input-minimal dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={() => load(1)}
          className="btn-secondary text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          {t("inventory.filters.filterButton")}
        </button>
      </div>

      <div className="table-modern">
        <table className="min-w-[640px]">
          <thead>
            <tr>
              <th className="font-medium">{t("inventory.colDateTime")}</th>
              <th className="font-medium">{t("inventory.colBranch")}</th>
              <th className="font-medium">{t("inventory.colProductVariant")}</th>
              <th className="font-medium">{t("inventory.colType")}</th>
              <th className="font-medium text-right">{t("inventory.colBefore")}</th>
              <th className="font-medium text-right">{t("inventory.colAfter")}</th>
              <th className="font-medium">{t("inventory.colUser")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !result ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 dark:text-slate-400 py-8">
                  {t("inventory.loadingDots")}
                </td>
              </tr>
            ) : !result || result.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 dark:text-slate-400 py-8">
                  {t("inventory.noMovements")}
                </td>
              </tr>
            ) : (
              result.data.map((m) => (
                <tr key={m.id}>
                  <td className="text-slate-600 dark:text-slate-300">
                    {new Date(m.createdAt).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    {m.branch.name} ({m.branch.code})
                  </td>
                  <td>
                    {m.variant.product.name} — {m.variant.size} / {m.variant.color} (
                    {m.variant.sku})
                  </td>
                  <td>{MOVEMENT_TYPE_LABELS[m.type] ?? m.type}</td>
                  <td className="text-right tabular-nums">{m.quantityBefore}</td>
                  <td className="text-right tabular-nums font-medium">{m.quantityAfter}</td>
                  <td>{m.user ? m.user.fullName : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result && result.total > 0 && (
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          onPageChange={setPage}
          className="mt-3"
        />
      )}
    </section>
  );
}
