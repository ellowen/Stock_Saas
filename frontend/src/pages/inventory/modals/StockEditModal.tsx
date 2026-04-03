import { useTranslation } from "react-i18next";
import type { EditStockState } from "../hooks/useStock";

type Props = {
  editStock: EditStockState;
  editStockSaving: boolean;
  editStockError: string | null;
  onChangeQuantity: (q: number) => void;
  onChangeMinStock: (v: number | "") => void;
  onChangeLocation: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export function StockEditModal({
  editStock,
  editStockSaving,
  editStockError,
  onChangeQuantity,
  onChangeMinStock,
  onChangeLocation,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-stock-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl p-5">
        <h2
          id="edit-stock-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1"
        >
          {t("inventory.editStockTitle")}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 truncate">
          {editStock.label}
        </p>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            {t("inventory.editStockQuantityLabel")}
          </label>
          <input
            type="number"
            min={0}
            value={editStock.quantity}
            onChange={(e) =>
              onChangeQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))
            }
            className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          />
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t("inventory.editStockMinLabel")}
            </label>
            <input
              type="number"
              min={0}
              placeholder={t("inventory.editStockMinPlaceholder")}
              value={editStock.minStock}
              onChange={(e) => {
                const v = e.target.value;
                onChangeMinStock(
                  v === "" ? "" : Math.max(0, parseInt(v, 10) || 0)
                );
              }}
              className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("inventory.editStockMinHint")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t("inventory.location")}
            </label>
            <input
              type="text"
              maxLength={100}
              placeholder={t("inventory.locationPlaceholder")}
              value={editStock.location}
              onChange={(e) => onChangeLocation(e.target.value)}
              className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
        </div>
        {editStockError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {editStockError}
          </p>
        )}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            {t("branches.cancel")}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={editStockSaving}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {editStockSaving ? t("inventory.editStockSaving") : t("inventory.editStockSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
