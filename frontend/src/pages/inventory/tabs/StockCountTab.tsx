import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import { useToast } from "../../../contexts/ToastContext";
import type { Branch } from "../types";

type CountStatus = "OPEN" | "APPLIED" | "CANCELLED";

type StockCountSummary = {
  id: number;
  status: CountStatus;
  notes: string | null;
  createdAt: string;
  closedAt: string | null;
  branch: { id: number; name: string; code: string };
  user: { id: number; fullName: string };
  _count: { items: number };
};

type CountItem = {
  id: number;
  variantId: number;
  systemQty: number;
  countedQty: number | null;
  variant: {
    id: number;
    sku: string;
    size: string;
    color: string;
    attributes: { value: string; attribute: { name: string } }[];
    product: { id: number; name: string };
  };
};

type StockCountDetail = StockCountSummary & { items: CountItem[] };

type Props = { branches: Branch[]; onStockChanged: () => void };

const STATUS_COLORS: Record<CountStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  APPLIED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

export function StockCountTab({ branches, onStockChanged }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [list, setList] = useState<StockCountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<StockCountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [applying, setApplying] = useState(false);

  // New session form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newBranchId, setNewBranchId] = useState<string>(branches[0] ? String(branches[0].id) : "");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Local edits for countedQty (itemId → value string)
  const [localCounts, setLocalCounts] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/stock-counts`, { headers: authHeaders() });
      if (res.ok) setList(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setLocalCounts({});
    setSearch("");
    try {
      const res = await authFetch(`${API_BASE_URL}/stock-counts/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data: StockCountDetail = await res.json();
      setDetail(data);
      // Pre-fill local counts with existing countedQty
      const init: Record<number, string> = {};
      data.items.forEach((item) => {
        if (item.countedQty !== null) init[item.id] = String(item.countedQty);
      });
      setLocalCounts(init);
    } catch { showToast(t("inventory.countLoadError"), "error"); }
    finally { setDetailLoading(false); }
  };

  const handleCreate = async () => {
    if (!newBranchId) return;
    setCreating(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/stock-counts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ branchId: Number(newBranchId), notes: newNotes.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const created: StockCountDetail = await res.json();
      showToast(t("inventory.countCreated"));
      setShowNewForm(false);
      setNewNotes("");
      await loadList();
      openDetail(created.id);
    } catch { showToast(t("inventory.countCreateError"), "error"); }
    finally { setCreating(false); }
  };

  const handleSaveItems = async () => {
    if (!detail) return;
    setSavingItems(true);
    const updates = Object.entries(localCounts).map(([itemIdStr, val]) => ({
      itemId: Number(itemIdStr),
      countedQty: val === "" ? null : Math.max(0, parseInt(val, 10) || 0),
    }));
    try {
      const res = await authFetch(`${API_BASE_URL}/stock-counts/${detail.id}/items`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error();
      showToast(t("inventory.countSaved"));
      await openDetail(detail.id);
    } catch { showToast(t("inventory.countSaveError"), "error"); }
    finally { setSavingItems(false); }
  };

  const handleApply = async () => {
    if (!detail) return;
    setApplying(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/stock-counts/${detail.id}/apply`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as { message?: string }).message);
      }
      const result = await res.json() as { applied: number };
      showToast(t("inventory.countApplied", { count: result.applied }));
      setDetail(null);
      loadList();
      onStockChanged();
    } catch (e) { showToast(e instanceof Error ? e.message : t("inventory.countApplyError"), "error"); }
    finally { setApplying(false); }
  };

  const handleCancel = async (id: number) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/stock-counts/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      showToast(t("inventory.countCancelled"));
      if (detail?.id === id) setDetail(null);
      loadList();
    } catch { showToast(t("inventory.countCancelError"), "error"); }
  };

  const variantLabel = (item: CountItem) => {
    const attrs = item.variant.attributes.map((a) => a.value).join(" / ");
    return attrs || [item.variant.size, item.variant.color].filter(Boolean).join(" / ") || "—";
  };

  const filteredItems = detail?.items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.variant.product.name.toLowerCase().includes(q) ||
      item.variant.sku.toLowerCase().includes(q)
    );
  }) ?? [];

  const countedCount = detail ? Object.values(localCounts).filter((v) => v !== "").length : 0;

  // ── Detail view ──
  if (detail) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setDetail(null)} className="btn-secondary text-sm">
            ← {t("inventory.countBackToList")}
          </button>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {t("inventory.countDetailTitle", { branch: detail.branch.name })}
          </h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[detail.status]}`}>
            {t(`inventory.countStatus${detail.status}`)}
          </span>
        </div>

        {detail.status === "OPEN" && (
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder={t("inventory.filters.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-minimal max-w-xs dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
              {t("inventory.countProgress", { counted: countedCount, total: detail.items.length })}
            </span>
            <button
              type="button"
              onClick={handleSaveItems}
              disabled={savingItems || Object.keys(localCounts).length === 0}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {savingItems ? t("inventory.countSaving") : t("inventory.countSaveBtn")}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || countedCount === 0}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {applying ? t("inventory.countApplying") : t("inventory.countApplyBtn", { count: countedCount })}
            </button>
          </div>
        )}

        {detailLoading ? (
          <p className="text-sm text-slate-500 py-8 text-center">{t("inventory.loadingDots")}</p>
        ) : (
          <div className="table-modern">
            <table className="min-w-[500px]">
              <thead>
                <tr>
                  <th className="text-left">{t("inventory.colProductVariant")}</th>
                  <th className="text-left">{t("inventory.colSku")}</th>
                  <th className="text-right w-24">{t("inventory.countSystemQty")}</th>
                  <th className="text-right w-28">{t("inventory.countCountedQty")}</th>
                  <th className="text-right w-20">{t("inventory.bulkAdjustDiff")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const localVal = localCounts[item.id] ?? (item.countedQty !== null ? String(item.countedQty) : "");
                  const hasDiff = localVal !== "" && Number(localVal) !== item.systemQty;
                  const diff = localVal !== "" ? Number(localVal) - item.systemQty : null;
                  return (
                    <tr key={item.id} className={hasDiff ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                      <td className="text-slate-800 dark:text-slate-200">
                        {item.variant.product.name}
                        <span className="text-slate-400 dark:text-slate-500 ml-1 text-xs">{variantLabel(item)}</span>
                      </td>
                      <td className="font-mono text-xs text-slate-500 dark:text-slate-400">{item.variant.sku}</td>
                      <td className="text-right font-medium text-slate-700 dark:text-slate-300">{item.systemQty}</td>
                      <td className="text-right">
                        {detail.status === "OPEN" ? (
                          <input
                            type="number"
                            min={0}
                            value={localVal}
                            onChange={(e) => setLocalCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="—"
                            className="w-20 text-right input-minimal py-1 px-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                          />
                        ) : (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {item.countedQty ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className={`text-right font-semibold text-sm ${diff === null ? "" : diff > 0 ? "text-emerald-600 dark:text-emerald-400" : diff < 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"}`}>
                        {diff === null ? "—" : diff === 0 ? "±0" : diff > 0 ? `+${diff}` : String(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  // ── List view ──
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {t("inventory.countTitle")}
        </h3>
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          {t("inventory.countNewBtn")}
        </button>
      </div>

      {/* New session form */}
      {showNewForm && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("inventory.countNewTitle")}</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t("inventory.filters.branch")}
              </label>
              <select
                value={newBranchId}
                onChange={(e) => setNewBranchId(e.target.value)}
                className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t("inventory.countNotes")}
              </label>
              <input
                type="text"
                placeholder={t("inventory.countNotesPlaceholder")}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="input-minimal w-full dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNewForm(false)} className="btn-secondary text-sm">
                {t("branches.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newBranchId}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {creating ? t("inventory.countCreating") : t("inventory.countCreate")}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">{t("inventory.loadingDots")}</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 px-6 py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t("inventory.countEmpty")}</p>
        </div>
      ) : (
        <div className="table-modern">
          <table className="min-w-[400px]">
            <thead>
              <tr>
                <th className="text-left">{t("inventory.colBranch")}</th>
                <th className="text-left">{t("inventory.countCreatedBy")}</th>
                <th className="text-left">{t("inventory.countDate")}</th>
                <th className="text-left">{t("inventory.countItems")}</th>
                <th className="text-left">{t("reports.status")}</th>
                <th className="w-32">{t("inventory.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((sc) => (
                <tr key={sc.id}>
                  <td>{sc.branch.name} ({sc.branch.code})</td>
                  <td className="text-slate-500 dark:text-slate-400">{sc.user.fullName}</td>
                  <td className="text-slate-500 dark:text-slate-400 text-sm">
                    {new Date(sc.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="text-slate-600 dark:text-slate-300">{sc._count.items}</td>
                  <td>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[sc.status]}`}>
                      {t(`inventory.countStatus${sc.status}`)}
                    </span>
                  </td>
                  <td className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openDetail(sc.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                    >
                      {t("inventory.countView")}
                    </button>
                    {sc.status === "OPEN" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(sc.id)}
                        className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 font-medium"
                      >
                        {t("inventory.countCancel")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
