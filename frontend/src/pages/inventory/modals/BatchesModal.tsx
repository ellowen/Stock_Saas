import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import { useToast } from "../../../contexts/ToastContext";

type Batch = {
  id: number;
  batchNumber: string;
  expiresAt: string | null;
  quantity: number;
};

type Props = {
  variantId: number;
  branchId: number;
  variantLabel: string;
  onClose: () => void;
};

const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() <= DAYS_30;
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function BatchesModal({ variantId, branchId, variantLabel, onClose }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New batch form
  const [newNumber, setNewNumber] = useState("");
  const [newExpires, setNewExpires] = useState("");
  const [newQty, setNewQty] = useState("0");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE_URL}/batches?variantId=${variantId}&branchId=${branchId}`,
        { headers: authHeaders() }
      );
      if (res.ok) setBatches(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!newNumber.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/batches`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          variantId,
          branchId,
          batchNumber: newNumber.trim(),
          expiresAt: newExpires ? new Date(newExpires).toISOString() : null,
          quantity: parseInt(newQty, 10) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      showToast(t("inventory.batchCreated"));
      setNewNumber(""); setNewExpires(""); setNewQty("0"); setShowForm(false);
      load();
    } catch { showToast(t("inventory.batchSaveError"), "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/batches/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      showToast(t("inventory.batchDeleted"));
      load();
    } catch { showToast(t("inventory.batchDeleteError"), "error"); }
  };

  const totalQty = batches.reduce((s, b) => s + b.quantity, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-600">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("inventory.batchesTitle")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{variantLabel}</p>
          {totalQty > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {t("inventory.batchesTotalQty", { qty: totalQty })}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">{t("inventory.loadingDots")}</p>
          ) : batches.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              {t("inventory.batchesEmpty")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left pb-2 pr-3">{t("inventory.batchNumber")}</th>
                  <th className="text-left pb-2 pr-3">{t("inventory.batchExpires")}</th>
                  <th className="text-right pb-2 pr-3 w-16">{t("inventory.batchQty")}</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {batches.map((b) => {
                  const expired = isExpired(b.expiresAt);
                  const soon = !expired && isExpiringSoon(b.expiresAt);
                  return (
                    <tr key={b.id}>
                      <td className="py-2 pr-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {b.batchNumber}
                      </td>
                      <td className="py-2 pr-3">
                        {b.expiresAt ? (
                          <span className={`text-xs font-medium ${expired ? "text-red-600 dark:text-red-400" : soon ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
                            {new Date(b.expiresAt).toLocaleDateString("es-AR")}
                            {expired && ` (${t("inventory.batchExpired")})`}
                            {soon && ` (${t("inventory.batchExpiringSoon")})`}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        {b.quantity}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id)}
                          className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium"
                        >
                          {t("inventory.batchDelete")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* New batch form */}
          {showForm ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 p-3 space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("inventory.batchNew")}</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder={t("inventory.batchNumberPlaceholder")}
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="input-minimal flex-1 min-w-[120px] text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                />
                <input
                  type="date"
                  value={newExpires}
                  onChange={(e) => setNewExpires(e.target.value)}
                  className="input-minimal w-36 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="input-minimal w-20 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm py-1">
                  {t("branches.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || !newNumber.trim()}
                  className="btn-primary text-sm py-1 disabled:opacity-50"
                >
                  {saving ? t("inventory.batchSaving") : t("inventory.batchAdd")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              + {t("inventory.batchAddBtn")}
            </button>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-600 flex justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t("branches.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
