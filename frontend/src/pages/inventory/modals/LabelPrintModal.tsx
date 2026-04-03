import { useTranslation } from "react-i18next";
import { Barcode } from "../../../components/Barcode";
import type { InventoryRow } from "../types";

type Props = {
  rows: InventoryRow[];
  onClose: () => void;
};

export function LabelPrintModal({ rows, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900"
      role="dialog"
      aria-modal="true"
      aria-label={t("inventory.labelsTitle")}
    >
      <div className="no-print flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {t("inventory.labelsTitle")}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary"
          >
            {t("inventory.labelsPrint")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            {t("inventory.labelsClose")}
          </button>
        </div>
      </div>
      <div className="print-labels-zone flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3">
          {rows.map((row) => {
            const price =
              row.variant.price != null &&
              typeof (row.variant.price as { toString?: () => string }).toString === "function"
                ? (row.variant.price as { toString(): string }).toString()
                : row.variant.price != null
                ? String(row.variant.price)
                : "—";
            return (
              <div
                key={`${row.branch.id}-${row.variant.id}`}
                className="rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 print:break-inside-avoid"
              >
                <p
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate"
                  title={row.variant.product.name}
                >
                  {row.variant.product.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {row.variant.size} / {row.variant.color} · {row.variant.sku}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {row.branch.name}
                </p>
                <div className="flex justify-center my-2 min-h-[44px]">
                  <Barcode value={row.variant.barcode ?? ""} height={36} width={1.5} />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  ${price}
                </p>
                <p className="text-xs text-slate-500">{t("inventory.labelsStock")}: {row.quantity}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
