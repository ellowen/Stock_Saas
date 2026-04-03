import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import { useToast } from "../../../contexts/ToastContext";
import type { Branch, InventoryRow } from "../types";

type AdjustRow = InventoryRow & { newQty: string };

type Props = {
  branches: Branch[];
  onClose: () => void;
  onDone: () => void;
};

export function BulkAdjustModal({ branches, onClose, onDone }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [branchId, setBranchId] = useState<string>(branches[0] ? String(branches[0].id) : "");
  const [rows, setRows] = useState<AdjustRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch inventory for selected branch
  useEffect(() => {
    if (!branchId) return;
    setLoadingRows(true);
    authFetch(`${API_BASE_URL}/inventory?branchId=${branchId}&hideZero=false`, {
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data: InventoryRow[] | { data: InventoryRow[] }) => {
        const list: InventoryRow[] = Array.isArray(data) ? data : (data as { data: InventoryRow[] }).data ?? [];
        setRows(list.map((row) => ({ ...row, newQty: "" })));
      })
      .catch(() => showToast(t("inventory.bulkAdjustLoadError"), "error"))
      .finally(() => setLoadingRows(false));
  }, [branchId, showToast, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.variant.product.name.toLowerCase().includes(q) ||
        r.variant.sku.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const changedRows = rows.filter((r) => r.newQty !== "" && Number(r.newQty) !== r.quantity);

  const updateQty = (id: number, val: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, newQty: val } : r)));
  };

  const handleConfirm = async () => {
    if (!branchId || !reason.trim() || changedRows.length === 0) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory/bulk-adjust`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          branchId: Number(branchId),
          reason: reason.trim(),
          adjustments: changedRows.map((r) => ({
            variantId: r.variant.id,
            newQty: Math.max(0, parseInt(r.newQty, 10) || 0),
          })),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as { message?: string }).message || t("inventory.bulkAdjustError"));
      }
      const result = await res.json() as { count: number };
      showToast(t("inventory.bulkAdjustSuccess", { count: result.count }));
      onDone();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("inventory.bulkAdjustError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const diffColor = (current: number, newQtyStr: string) => {
    if (newQtyStr === "") return "";
    const diff = Number(newQtyStr) - current;
    if (diff > 0) return "text-emerald-600 dark:text-emerald-400";
    if (diff < 0) return "text-red-600 dark:text-red-400";
    return "text-slate-400 dark:text-slate-500";
  };

  const diffLabel = (current: number, newQtyStr: string) => {
    if (newQtyStr === "") return "—";
    const diff = Number(newQtyStr) - current;
    return diff === 0 ? "±0" : diff > 0 ? `+${diff}` : String(diff);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-600">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("inventory.bulkAdjustTitle")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("inventory.bulkAdjustSubtitle")}
          </p>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-600 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t("inventory.filters.branch")}
            </label>
            <select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setSearch(""); }}
              className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t("inventory.bulkAdjustSearch")}
            </label>
            <input
              type="text"
              placeholder={t("inventory.filters.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-minimal w-full dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t("inventory.bulkAdjustReason")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={t("inventory.bulkAdjustReasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={255}
              className="input-minimal w-full dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loadingRows ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              {t("inventory.loadingDots")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              {t("inventory.noStockItems")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left pb-2 pr-3">{t("inventory.colProductVariant")}</th>
                  <th className="text-left pb-2 pr-3">{t("inventory.colSku")}</th>
                  <th className="text-right pb-2 pr-3 w-20">{t("inventory.bulkAdjustCurrentQty")}</th>
                  <th className="text-right pb-2 pr-3 w-24">{t("inventory.bulkAdjustNewQty")}</th>
                  <th className="text-right pb-2 w-16">{t("inventory.bulkAdjustDiff")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {filtered.map((row) => (
                  <tr key={row.id} className={row.newQty !== "" && Number(row.newQty) !== row.quantity ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                    <td className="py-2 pr-3 text-slate-800 dark:text-slate-200">
                      {row.variant.product.name}
                      {(row.variant.size || row.variant.color) && (
                        <span className="text-slate-400 dark:text-slate-500 ml-1">
                          {[row.variant.size, row.variant.color].filter(Boolean).join(" / ")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {row.variant.sku}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {row.quantity}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        type="number"
                        min={0}
                        value={row.newQty}
                        onChange={(e) => updateQty(row.id, e.target.value)}
                        placeholder={String(row.quantity)}
                        className="w-20 text-right input-minimal py-1 px-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      />
                    </td>
                    <td className={`py-2 text-right font-semibold text-sm ${diffColor(row.quantity, row.newQty)}`}>
                      {diffLabel(row.quantity, row.newQty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {changedRows.length > 0
              ? t("inventory.bulkAdjustChangedCount", { count: changedRows.length })
              : t("inventory.bulkAdjustNoChanges")}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t("branches.cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || changedRows.length === 0 || !reason.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? t("inventory.bulkAdjustSaving") : t("inventory.bulkAdjustConfirm", { count: changedRows.length })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
