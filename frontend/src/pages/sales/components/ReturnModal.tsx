import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SaleListItem } from "../types";
import type { ReturnItemInput } from "../hooks/useSales";

type Props = {
  sale: SaleListItem;
  onConfirm: (items: ReturnItemInput[], reason: string) => Promise<void>;
  onClose: () => void;
};

export function ReturnModal({ sale, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(sale.items.map((i) => [i.productVariantId, 0]))
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anySelected = Object.values(quantities).some((q) => q > 0);

  const handleConfirm = async () => {
    const items: ReturnItemInput[] = sale.items
      .filter((i) => (quantities[i.productVariantId] ?? 0) > 0)
      .map((i) => ({ variantId: i.productVariantId, quantity: quantities[i.productVariantId] }));

    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(items, reason);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("sales.returnError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t("sales.returnTitle")} #{sale.id}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {new Date(sale.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
            {" · "}{sale.branch.name}
          </p>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-72 overflow-y-auto">
          {sale.items.map((item) => (
            <div key={item.productVariantId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {item.variant.product.name} · {item.variant.sku}
                </p>
                <p className="text-xs text-slate-400">{t("sales.returnQty")}: {item.quantity} · ${Number(item.unitPrice).toFixed(2)}</p>
              </div>
              <input
                type="number"
                min={0}
                max={item.quantity}
                value={quantities[item.productVariantId] || ""}
                placeholder="0"
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setQuantities((q) => ({
                    ...q,
                    [item.productVariantId]: isNaN(v) ? 0 : Math.min(Math.max(0, v), item.quantity),
                  }));
                }}
                className="w-20 text-sm px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center"
              />
            </div>
          ))}
        </div>

        <div className="px-6 pb-2">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("sales.returnReason")}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("sales.returnReasonPlaceholder")}
            className="input-minimal w-full dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 text-sm"
          />
        </div>

        {error && (
          <p className="px-6 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            {t("branches.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !anySelected}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {submitting ? "..." : t("sales.returnConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
