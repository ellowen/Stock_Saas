import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";

type Customer = { id: number; name: string; taxId: string | null; phone: string | null };

type Props = {
  selectedCustomer: Customer | null;
  onSelect: (c: Customer | null) => void;
};

export function CustomerSearchInput({ selectedCustomer, onSelect }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickTaxId, setQuickTaxId] = useState("");
  const [creating, setCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/customers?search=${encodeURIComponent(q)}&pageSize=8`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as { data: Customer[] } | Customer[];
        setResults(Array.isArray(data) ? data : (data as { data: Customer[] }).data ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowQuickCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleQuickCreate = async () => {
    if (!quickName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/customers`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: quickName.trim(), taxId: quickTaxId.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const created: Customer = await res.json();
      onSelect(created);
      setQuery("");
      setOpen(false);
      setShowQuickCreate(false);
      setQuickName("");
      setQuickTaxId("");
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
            {selectedCustomer.name}
          </p>
          {selectedCustomer.taxId && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{selectedCustomer.taxId}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
        >
          {t("sales.customerDetach")}
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={t("sales.customerPlaceholder")}
        className="input-minimal w-full dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
      />
      {open && (query.trim() || showQuickCreate) && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
          {loading && (
            <p className="px-3 py-2 text-sm text-slate-400">{t("inventory.loadingDots")}</p>
          )}
          {!loading && results.length === 0 && query.trim() && !showQuickCreate && (
            <p className="px-3 py-2 text-sm text-slate-400">{t("sales.customerNoResults")}</p>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.name}</p>
              {c.taxId && <p className="text-xs text-slate-400">{c.taxId}</p>}
            </button>
          ))}

          {/* Quick create */}
          {!showQuickCreate ? (
            <button
              type="button"
              onClick={() => { setShowQuickCreate(true); setQuickName(query); }}
              className="w-full text-left px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium"
            >
              + {t("sales.customerCreate")} {query.trim() ? `"${query}"` : ""}
            </button>
          ) : (
            <div className="px-3 py-3 space-y-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t("sales.customerQuickCreateTitle")}</p>
              <input
                type="text"
                placeholder={t("sales.customerName")}
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="input-minimal w-full text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                autoFocus
              />
              <input
                type="text"
                placeholder={t("sales.customerTaxId")}
                value={quickTaxId}
                onChange={(e) => setQuickTaxId(e.target.value)}
                className="input-minimal w-full text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="btn-secondary text-xs py-1 flex-1"
                >
                  {t("branches.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={creating || !quickName.trim()}
                  className="btn-primary text-xs py-1 flex-1 disabled:opacity-50"
                >
                  {creating ? "..." : t("sales.customerQuickCreate")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
