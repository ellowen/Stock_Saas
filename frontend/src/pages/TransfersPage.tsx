import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Tooltip } from "../components/Tooltip";
import { IconPlus } from "../components/Icons";
import { TableSortHeader, sortByColumn } from "../components/TableSortHeader";

type Branch = { id: number; name: string; code: string };
type Transfer = {
  id: number;
  status: string;
  fromBranchId: number;
  toBranchId: number;
  createdAt: string;
  items: Array<{ productVariantId: number; quantity: number }>;
  fromBranch?: Branch;
  toBranch?: Branch;
};

export function TransfersPage() {
  const { t } = useTranslation();
  const { canManageTransfers } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [fromBranchId, setFromBranchId] = useState<number | "">("");
  const [toBranchId, setToBranchId] = useState<number | "">("");
  const [transferItems, setTransferItems] = useState<Array<{ productVariantId: string; quantity: string }>>([
    { productVariantId: "", quantity: "1" },
  ]);
  const [completeId, setCompleteId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key && d === "asc" ? "desc" : "asc"));
  };
  const sortedTransfers = sortByColumn(transfers, sortKey, sortDir, (t, k) => {
    if (k === "id") return t.id;
    if (k === "from") return t.fromBranch ? `${t.fromBranch.name} ${t.fromBranch.code}` : String(t.fromBranchId);
    if (k === "to") return t.toBranch ? `${t.toBranch.name} ${t.toBranch.code}` : String(t.toBranchId);
    if (k === "status") return t.status;
    if (k === "date") return t.createdAt;
    return "";
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bRes, tRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() }),
        authFetch(`${API_BASE_URL}/stock-transfers`, { headers: authHeaders() }),
      ]);
      if (!bRes.ok) throw new Error(t("transfers.errorBranches"));
      if (!tRes.ok) throw new Error(t("transfers.errorTransfers"));
      const bData = await bRes.json();
      const tData = await tRes.json();
      setBranches(bData);
      setTransfers(tData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!canManageTransfers) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const addItem = () => {
    setTransferItems((i) => [...i, { productVariantId: "", quantity: "1" }]);
  };

  const updateItem = (idx: number, field: "productVariantId" | "quantity", value: string) => {
    setTransferItems((i) =>
      i.map((row, j) => (j === idx ? { ...row, [field]: value } : row))
    );
  };

  const removeItem = (idx: number) => {
    if (transferItems.length <= 1) return;
    setTransferItems((i) => i.filter((_, j) => j !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId) {
      setCreateError(t("transfers.selectTwoBranches"));
      return;
    }
    const items = transferItems
      .filter((i) => i.productVariantId.trim() && parseInt(i.quantity, 10) > 0)
      .map((i) => ({
        productVariantId: parseInt(i.productVariantId, 10),
        quantity: parseInt(i.quantity, 10),
      }));
    if (items.length === 0) {
      setCreateError(t("transfers.addItemHint"));
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/stock-transfers`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          fromBranchId: Number(fromBranchId),
          toBranchId: Number(toBranchId),
          items,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al crear traspaso");
      setCreateOpen(false);
      setFromBranchId("");
      setToBranchId("");
      setTransferItems([{ productVariantId: "", quantity: "1" }]);
      load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(completeId, 10);
    if (!id) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/stock-transfers/complete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ transferId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al completar traspaso");
      setCompleteId("");
      load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">{t("transfers.loading")}</p>;
  if (error) return <p className="text-sm text-red-400/90">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{t("transfers.subtitleLong")}</p>
        <Tooltip content={t("transfers.tooltipCreate")}>
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary inline-flex items-center gap-2">
            <IconPlus />
            {t("transfers.newTransfer")}
          </button>
        </Tooltip>
      </div>

      <div className="table-modern">
        <table className="min-w-[320px]">
          <thead>
            <tr>
              <TableSortHeader label="ID" sortKey="id" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("transfers.from")} sortKey="from" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("transfers.to")} sortKey="to" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("transfers.status")} sortKey="status" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
              <TableSortHeader label={t("transfers.date")} sortKey="date" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedTransfers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">
                  {t("transfers.noTransfers")}
                </td>
              </tr>
            ) : (
              sortedTransfers.map((tr) => (
                <tr key={tr.id}>
                  <td>{tr.id}</td>
                  <td>
                    {tr.fromBranch
                      ? `${tr.fromBranch.name} (${tr.fromBranch.code})`
                      : tr.fromBranchId}
                  </td>
                  <td>
                    {tr.toBranch ? `${tr.toBranch.name} (${tr.toBranch.code})` : tr.toBranchId}
                  </td>
                  <td>{tr.status === "PENDING" ? t("transfers.pending") : tr.status === "COMPLETED" ? t("transfers.completed") : tr.status}</td>
                  <td>
                    {new Date(tr.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="card-minimal max-w-sm">
        <Tooltip content={t("transfers.completeSectionTooltip")}>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t("transfers.completeSectionTitle")}</h3>
        </Tooltip>
        <form onSubmit={handleComplete} className="flex gap-2">
          <input
            type="number"
            placeholder="ID"
            value={completeId}
            onChange={(e) => setCompleteId(e.target.value)}
            className="input-minimal w-24"
          />
          <button type="submit" disabled={submitting || !completeId} className="btn-secondary disabled:opacity-50">
            {submitting ? "…" : t("transfers.completeButton")}
          </button>
        </form>
        {createError && <p className="text-sm text-red-400/90 mt-2">{createError}</p>}
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">{t("transfers.newTransferTitle")}</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t("transfers.fromLabel")}</label>
                  <select
                    value={fromBranchId === "" ? "" : String(fromBranchId)}
                    onChange={(e) => setFromBranchId(e.target.value ? Number(e.target.value) : "")}
                    className="input-minimal"
                  >
                    <option value="">{t("transfers.selectOption")}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t("transfers.toLabel")}</label>
                  <select
                    value={toBranchId === "" ? "" : String(toBranchId)}
                    onChange={(e) => setToBranchId(e.target.value ? Number(e.target.value) : "")}
                    className="input-minimal"
                  >
                    <option value="">{t("transfers.selectOption")}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t("transfers.itemsLabel")}</span>
                  <button type="button" onClick={addItem} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">{t("transfers.addRow")}</button>
                </div>
                {transferItems.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="number" placeholder={t("transfers.variantId")} value={item.productVariantId} onChange={(e) => updateItem(i, "productVariantId", e.target.value)} className="input-minimal flex-1 py-1.5" />
                    <input type="number" placeholder={t("transfers.qty")} min={1} value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} className="input-minimal w-20 py-1.5" />
                    <button type="button" onClick={() => removeItem(i)} disabled={transferItems.length <= 1} className="text-slate-500 hover:text-red-600 disabled:opacity-40 p-1.5 rounded">✕</button>
                  </div>
                ))}
              </div>
              {createError && <p className="text-sm text-red-400/90">{createError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">{t("branches.cancel")}</button>
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? t("transfers.creating") : t("transfers.create")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
