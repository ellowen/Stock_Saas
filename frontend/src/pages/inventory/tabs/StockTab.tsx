import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TableSortHeader } from "../../../components/TableSortHeader";
import { Tooltip } from "../../../components/Tooltip";
import { Pagination } from "../../../components/Pagination";
import { isLowStock } from "../types";
import type { Branch, InventoryPaginated, InventoryRow } from "../types";
import type { EditStockState } from "../hooks/useStock";

type Props = {
  result: InventoryPaginated | null;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (p: number) => void;
  branchId: string;
  setBranchId: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  setDebouncedSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  lowStockOnly: boolean;
  setLowStockOnly: (v: boolean) => void;
  hideZero: boolean;
  setHideZero: (v: boolean) => void;
  sortKey: string | null;
  sortDir: "asc" | "desc";
  handleSort: (key: string) => void;
  load: (p: number, searchOverride?: string) => void;
  setEditStock: (v: EditStockState | null) => void;
  onShowBatches: (variantId: number, branchId: number, label: string) => void;
  exportCsv: () => void;
  exportCsvLoading: boolean;
  exportExcel: () => void;
  exportExcelLoading: boolean;
  exportPdf: () => void;
  exportPdfLoading: boolean;
  sortedInventory: InventoryRow[];
  branches: Branch[];
  categories: string[];
  brands: string[];
  onShowLabels: () => void;
};

export function StockTab({
  result,
  loading,
  error,
  page,
  setPage,
  branchId,
  setBranchId,
  search,
  setSearch,
  setDebouncedSearch,
  category,
  setCategory,
  brand,
  setBrand,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  lowStockOnly,
  setLowStockOnly,
  hideZero,
  setHideZero,
  sortKey,
  sortDir,
  handleSort,
  load,
  setEditStock,
  onShowBatches,
  exportCsv,
  exportCsvLoading,
  exportExcel,
  exportExcelLoading,
  exportPdf,
  exportPdfLoading,
  sortedInventory,
  branches,
  categories,
  brands,
  onShowLabels,
}: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search, setDebouncedSearch]);

  useEffect(() => { load(page); }, [page, load]);

  const anyExporting = exportCsvLoading || exportExcelLoading || exportPdfLoading;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {t("inventory.stockTitle")}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Tooltip content={t("inventory.exportCsvStockTooltip")}>
            <button
              type="button"
              onClick={exportCsv}
              disabled={anyExporting}
              className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {exportCsvLoading ? t("inventory.exporting") : t("inventory.exportCsv")}
            </button>
          </Tooltip>
          <Tooltip content={t("inventory.exportExcelStockTooltip")}>
            <button
              type="button"
              onClick={exportExcel}
              disabled={anyExporting}
              className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {exportExcelLoading ? t("inventory.exporting") : t("inventory.exportExcel")}
            </button>
          </Tooltip>
          <Tooltip content={t("inventory.exportPdfStockTooltip")}>
            <button
              type="button"
              onClick={exportPdf}
              disabled={anyExporting}
              className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {exportPdfLoading ? t("inventory.exporting") : t("inventory.exportPdf")}
            </button>
          </Tooltip>
          <Tooltip content={t("inventory.printLabelsTooltip")}>
            <button type="button" onClick={onShowLabels} disabled={!result?.data?.length}
              className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50">
              {t("inventory.printLabels")}
            </button>
          </Tooltip>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-2">
          {error}
          <button
            type="button"
            onClick={() => load(page)}
            className="ml-2 underline"
          >
            {t("inventory.retry")}
          </button>
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-3 items-end">
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
            className="input-minimal max-w-[200px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">{t("inventory.filters.allBranches")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("inventory.filters.nameOrSku")}
          </label>
          <input
            type="text"
            placeholder={t("inventory.filters.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => e.key === "Enter" && load(1, search)}
            className="input-minimal max-w-xs dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("inventory.filters.category")}
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="input-minimal max-w-[200px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            aria-label={t("inventory.filters.category")}
          >
            <option value="">{t("inventory.filters.allCategories")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("inventory.filters.brand")}
          </label>
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setPage(1);
            }}
            className="input-minimal max-w-[200px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            aria-label={t("inventory.filters.brand")}
          >
            <option value="">{t("inventory.filters.allBrands")}</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("inventory.filters.minPrice")}
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className="input-minimal w-24 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            aria-label={t("inventory.filters.minPrice")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("inventory.filters.maxPrice")}
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="—"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="input-minimal w-24 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            aria-label={t("inventory.filters.maxPrice")}
          />
        </div>
        <Tooltip content={t("inventory.lowStockTooltip")}>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700"
            />
            {t("inventory.filters.lowStockOnly")}
          </label>
        </Tooltip>
        <Tooltip content={t("inventory.hideZeroTooltip")}>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={hideZero}
              onChange={(e) => {
                setHideZero(e.target.checked);
                setPage(1);
              }}
              className="rounded border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700"
            />
            {t("inventory.filters.hideZero")}
          </label>
        </Tooltip>
        <button
          type="button"
          onClick={() => {
            setDebouncedSearch(search);
            setPage(1);
            load(1);
          }}
          className="btn-secondary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          {t("inventory.filters.filterButton")}
        </button>
      </div>

      <div className="table-modern">
        <table className="min-w-[400px]">
          <thead>
            <tr>
              <TableSortHeader label={t("inventory.colBranch")} sortKey="branch" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("inventory.colProductVariant")} sortKey="product" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("inventory.colSku")} sortKey="sku" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("inventory.colQuantity")} sortKey="quantity" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <th className="w-28">{t("inventory.colLocation")}</th>
              <th className="w-24">{t("inventory.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !result ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">
                  {t("inventory.loadingDots")}
                </td>
              </tr>
            ) : !result || result.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">
                  {t("inventory.noStockItems")}
                </td>
              </tr>
            ) : (
              sortedInventory.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.branch.name} ({row.branch.code})
                  </td>
                  <td>
                    {row.variant.product.name} — {row.variant.size} / {row.variant.color}
                  </td>
                  <td>{row.variant.sku}</td>
                  <td className="font-medium">
                    <span
                      className={
                        isLowStock(row)
                          ? "text-red-600 dark:text-red-400 font-semibold"
                          : ""
                      }
                    >
                      {row.quantity}
                    </span>
                    {isLowStock(row) && (
                      <span
                        className="ml-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                        title={t("inventory.lowStockTitle")}
                      >
                        {t("inventory.lowStockBelowMin")}
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-slate-500 dark:text-slate-400">
                    {row.location ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="flex gap-3">
                    <Tooltip content={t("inventory.editStockTooltip")}>
                      <button
                        type="button"
                        onClick={() =>
                          setEditStock({
                            branchId: row.branch.id,
                            productVariantId: row.variant.id,
                            quantity: row.quantity,
                            minStock: row.minStock ?? "",
                            location: row.location ?? "",
                            label: `${row.variant.product.name} · ${row.variant.sku} (${row.branch.code})`,
                          })
                        }
                        className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                      >
                        {t("inventory.editStockBtn")}
                      </button>
                    </Tooltip>
                    <button
                      type="button"
                      onClick={() =>
                        onShowBatches(
                          row.variant.id,
                          row.branch.id,
                          `${row.variant.product.name} · ${row.variant.sku}`
                        )
                      }
                      className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                    >
                      {t("inventory.batchesBtn")}
                    </button>
                  </td>
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
