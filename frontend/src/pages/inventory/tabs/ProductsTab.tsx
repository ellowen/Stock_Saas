import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { sortByColumn } from "../../../components/TableSortHeader";
import { TableSortHeader } from "../../../components/TableSortHeader";
import { Tooltip } from "../../../components/Tooltip";
import { Pagination } from "../../../components/Pagination";
import type { Product } from "../types";
import type { UseProductsReturn } from "./types";

type Props = UseProductsReturn & {
  categories: string[];
  brands: string[];
  onOpenCreate: () => void;
  onOpenEdit: (p: Product) => void;
  onOpenDelete: (p: Product) => void;
};

export function ProductsTab({
  result,
  loading,
  error,
  page,
  setPage,
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
  sortKey,
  sortDir,
  handleSort,
  load,
  exportCsv,
  exportCsvLoading,
  exportExcel,
  exportExcelLoading,
  exportPdf,
  exportPdfLoading,
  categories,
  brands,
  onOpenCreate,
  onOpenEdit,
  onOpenDelete,
}: Props) {
  const { t } = useTranslation();
  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search, setDebouncedSearch]);

  // Reload when page changes
  useEffect(() => {
    load(page);
  }, [page, load]);

  const sortedProducts = result?.data
    ? sortByColumn(result.data, sortKey, sortDir, (p, k) => {
        if (k === "name") return p.name;
        if (k === "category") return p.category ?? "";
        if (k === "brand") return p.brand ?? "";
        if (k === "price") {
          const prices = p.variants.map((v) =>
            parseFloat(typeof v.price === "string" ? v.price : String(v.price))
          );
          return prices.length ? Math.min(...prices) : 0;
        }
        if (k === "variants") return p.variants.length;
        return "";
      })
    : [];

  const anyExporting = exportCsvLoading || exportExcelLoading || exportPdfLoading;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t("inventory.productsTitle")}</h3>
        <div className="flex flex-wrap gap-2">
          <Tooltip content={t("inventory.exportCsvTooltip")}>
            <button
              type="button"
              onClick={exportCsv}
              disabled={anyExporting}
              className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {exportCsvLoading ? t("inventory.exporting") : t("inventory.exportCsv")}
            </button>
          </Tooltip>
          <Tooltip content={t("inventory.exportExcelTooltip")}>
            <button
              type="button"
              onClick={exportExcel}
              disabled={anyExporting}
              className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {exportExcelLoading ? t("inventory.exporting") : t("inventory.exportExcel")}
            </button>
          </Tooltip>
          <Tooltip content={t("inventory.exportPdfTooltip")}>
            <button
              type="button"
              onClick={exportPdf}
              disabled={anyExporting}
              className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              {exportPdfLoading ? t("inventory.exporting") : t("inventory.exportPdf")}
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
        <button
          type="button"
          onClick={() => {
            setDebouncedSearch(search);
            setPage(1);
            load(1, search);
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
              <TableSortHeader label={t("inventory.colName")} sortKey="name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("inventory.colCategory")} sortKey="category" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("inventory.colBrand")} sortKey="brand" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("inventory.colPrice")} sortKey="price" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("inventory.colVariants")} sortKey="variants" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <th className="w-32">{t("inventory.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !result ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-8">
                  {t("inventory.loadingDots")}
                </td>
              </tr>
            ) : !result || result.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-8">
                  {t("inventory.noProducts")}
                </td>
              </tr>
            ) : (
              sortedProducts.map((p) => {
                const prices = p.variants.map((v) =>
                  parseFloat(typeof v.price === "string" ? v.price : String(v.price))
                );
                const minP = prices.length ? Math.min(...prices) : null;
                const maxP = prices.length ? Math.max(...prices) : null;
                const priceLabel =
                  minP != null && maxP != null
                    ? minP === maxP
                      ? `$${minP.toFixed(2)}`
                      : `$${minP.toFixed(2)} – $${maxP.toFixed(2)}`
                    : "—";
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category ?? "—"}</td>
                    <td>{p.brand ?? "—"}</td>
                    <td className="tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {priceLabel}
                    </td>
                    <td>
                      {p.variants.length} ({p.variants.map((v) => v.sku).join(", ")})
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenEdit(p)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                        >
                          {t("inventory.editProduct")}
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => onOpenDelete(p)}
                          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          {t("inventory.deleteProduct")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
