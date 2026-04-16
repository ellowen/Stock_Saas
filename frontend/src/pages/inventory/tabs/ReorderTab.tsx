/**
import { getAccessToken } from "../../../lib/api";
 * ReorderTab — Stock forecasting & intelligent reorder suggestions
 *
 * Shows sales velocity, days-to-stockout, urgency tiers, and lets the user
 * select rows to auto-create a draft Purchase Order.
 */

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { Badge } from "../../../components/ui/Badge";
import type { Branch } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Urgency = "CRITICAL" | "WARNING" | "OK" | "DEAD";

interface ForecastRow {
  variantId: number;
  productId: number;
  productName: string;
  variantLabel: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  branchId: number;
  branchName: string;
  currentStock: number;
  minStock: number | null;
  sold30d: number;
  velocity: number;
  daysToStockout: number | null;
  urgency: Urgency;
  suggestedQty: number;
  lastSupplierId: number | null;
  lastSupplierName: string | null;
}

interface Supplier {
  id: number;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<Urgency, { label: string; variant: "danger" | "warning" | "success" | "neutral"; rowClass: string }> = {
  CRITICAL: { label: "Critico", variant: "danger",  rowClass: "bg-red-50/60 dark:bg-red-900/10" },
  WARNING:  { label: "Pronto",  variant: "warning", rowClass: "bg-amber-50/60 dark:bg-amber-900/10" },
  OK:       { label: "OK",      variant: "success", rowClass: "" },
  DEAD:     { label: "Sin mov", variant: "neutral", rowClass: "opacity-60" },
};

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const cfg = URGENCY_CONFIG[urgency];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReorderTab({ branches }: { branches: Branch[] }) {
  const { showToast } = useToast();

  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterUrgency, setFilterUrgency] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [analysisDays, setAnalysisDays] = useState<number>(30);

  const [selected, setSelected] = useState<Set<string>>(new Set()); // key = variantId-branchId
  const [creatingPO, setCreatingPO] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [defaultSupplierId, setDefaultSupplierId] = useState<string>("");
  const [targetBranchId, setTargetBranchId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams();
      if (filterBranch) params.set("branchId", filterBranch);
      if (filterUrgency) params.set("urgency", filterUrgency);
      params.set("days", String(analysisDays));

      const token = getAccessToken();
      const res = await fetch(`/analytics/reorder-suggestions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: ForecastRow[] = await res.json();
      setRows(data);
    } catch {
      showToast("Error al cargar sugerencias", "error");
    } finally {
      setLoading(false);
    }
  }, [filterBranch, filterUrgency, analysisDays, showToast]);

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const token = getAccessToken();
    fetch("/suppliers", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data: Supplier[]) => {
        setSuppliers(data.filter((s: any) => s.isActive !== false));
      })
      .catch(() => {});
    if (branches.length > 0 && !targetBranchId) {
      setTargetBranchId(String(branches[0].id));
    }
  }, [branches]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean) as string[])].sort();

  const filteredRows = rows.filter((r) => {
    if (filterCategory && r.category !== filterCategory) return false;
    return true;
  });

  const rowKey = (r: ForecastRow) => `${r.variantId}-${r.branchId}`;

  const toggleSelect = (r: ForecastRow) => {
    const k = rowKey(r);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleAll = () => {
    const selectableRows = filteredRows.filter((r) => r.suggestedQty > 0);
    if (selected.size === selectableRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableRows.map(rowKey)));
    }
  };

  const selectedRows = filteredRows.filter((r) => selected.has(rowKey(r)));

  const handleCreatePO = async () => {
    if (selectedRows.length === 0) { showToast("Seleccioná al menos un producto", "error"); return; }
    if (!targetBranchId) { showToast("Seleccioná una sucursal destino", "error"); return; }

    setCreatingPO(true);
    try {
      const lines = selectedRows.map((r) => ({
        variantId: r.variantId,
        qty: r.suggestedQty,
        supplierId: r.lastSupplierId ?? (defaultSupplierId ? Number(defaultSupplierId) : null),
        description: `${r.productName}${r.variantLabel ? ` (${r.variantLabel})` : ""}`,
        unitPrice: 0, // draft — proveedor completa precio
      }));

      const token = getAccessToken();
      const res = await fetch("/analytics/reorder-suggestions/create-po", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ branchId: Number(targetBranchId), lines }),
      });

      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const created: { orderId: number; itemCount: number }[] = await res.json();
      const total = created.reduce((s, c) => s + c.itemCount, 0);
      showToast(`${created.length} OC${created.length !== 1 ? "s" : ""} creada${created.length !== 1 ? "s" : ""} con ${total} items. Ver en Compras.`, "success");
      setSelected(new Set());
    } catch (err: any) {
      showToast(err.message ?? "Error al crear OC", "error");
    } finally {
      setCreatingPO(false);
    }
  };

  // Summary counts
  const countByUrgency = (u: Urgency) => rows.filter((r) => r.urgency === u).length;

  return (
    <div className="space-y-5">

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["CRITICAL", "WARNING", "OK", "DEAD"] as Urgency[]).map((u) => {
          const cfg = URGENCY_CONFIG[u];
          const count = countByUrgency(u);
          return (
            <button
              key={u}
              onClick={() => setFilterUrgency((prev) => prev === u ? "" : u)}
              className={[
                "rounded-xl border p-4 text-left transition-all",
                filterUrgency === u
                  ? "ring-2 ring-primary-500 border-primary-300 dark:border-primary-700"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                "bg-white dark:bg-gray-800",
              ].join(" ")}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{cfg.label}</p>
              <p className={`text-2xl font-bold ${
                u === "CRITICAL" ? "text-red-600 dark:text-red-400" :
                u === "WARNING"  ? "text-amber-600 dark:text-amber-400" :
                u === "OK"       ? "text-green-600 dark:text-green-400" :
                "text-gray-400"
              }`}>{count}</p>
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sucursal</label>
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="input-minimal text-sm w-44">
            <option value="">Todas</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Categoria</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-minimal text-sm w-44">
            <option value="">Todas</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Periodo analisis</label>
          <select value={analysisDays} onChange={(e) => setAnalysisDays(Number(e.target.value))} className="input-minimal text-sm w-36">
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>
        <button onClick={load} disabled={loading}
          className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors">
          {loading ? "Calculando..." : "Actualizar"}
        </button>
      </div>

      {/* ── Create PO toolbar (shows when rows selected) ── */}
      {selectedRows.length > 0 && (
        <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
              {selectedRows.length} producto{selectedRows.length !== 1 ? "s" : ""} seleccionado{selectedRows.length !== 1 ? "s" : ""}
            </span>
            <div>
              <label className="text-xs text-primary-600 dark:text-primary-400 mr-1">Sucursal destino:</label>
              <select value={targetBranchId} onChange={(e) => setTargetBranchId(e.target.value)} className="input-minimal text-sm w-40">
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {suppliers.length > 0 && (
              <div>
                <label className="text-xs text-primary-600 dark:text-primary-400 mr-1">Proveedor alternativo:</label>
                <select value={defaultSupplierId} onChange={(e) => setDefaultSupplierId(e.target.value)} className="input-minimal text-sm w-44">
                  <option value="">Usar ultimo proveedor</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <button onClick={handleCreatePO} disabled={creatingPO}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors">
            {creatingPO ? "Creando OC..." : "Crear OC con seleccionados"}
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Calculando velocidades de venta...</p>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-400 text-sm">
            {rows.length === 0
              ? "No hay datos de inventario. Agrega productos y registra ventas para ver sugerencias."
              : "No hay productos que coincidan con los filtros."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3">
                  <input type="checkbox"
                    checked={selected.size === filteredRows.filter((r) => r.suggestedQty > 0).length && filteredRows.some((r) => r.suggestedQty > 0)}
                    onChange={toggleAll}
                    className="rounded" />
                </th>
                {["Producto", "Sucursal", "Stock actual", "Vendido 30d", "Vel. (u/dia)", "Dias stock", "Urgencia", "Sugerir pedir", "Ultimo proveedor"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredRows.map((row) => {
                const k = rowKey(row);
                const isSelected = selected.has(k);
                const cfg = URGENCY_CONFIG[row.urgency];
                return (
                  <tr key={k}
                    onClick={() => row.suggestedQty > 0 && toggleSelect(row)}
                    className={[
                      "transition-colors",
                      cfg.rowClass,
                      row.suggestedQty > 0 ? "cursor-pointer" : "cursor-default",
                      isSelected ? "ring-inset ring-2 ring-primary-400 dark:ring-primary-600" : "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    ].join(" ")}
                  >
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={isSelected} readOnly
                        disabled={row.suggestedQty === 0}
                        className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{row.productName}</div>
                      {row.variantLabel && <div className="text-xs text-gray-400">{row.variantLabel}</div>}
                      {row.sku && <div className="text-xs text-gray-400 font-mono">{row.sku}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.branchName}</td>
                    <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">
                      <span className={row.currentStock === 0 ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                        {row.currentStock}
                      </span>
                      {row.minStock != null && (
                        <span className="text-xs text-gray-400 ml-1">(min {row.minStock})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">{row.sold30d}</td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                      {row.velocity > 0 ? row.velocity.toFixed(2) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {row.daysToStockout !== null ? (
                        <span className={
                          row.daysToStockout < 7 ? "text-red-600 dark:text-red-400 font-semibold" :
                          row.daysToStockout < 14 ? "text-amber-600 dark:text-amber-400 font-semibold" :
                          "text-gray-700 dark:text-gray-300"
                        }>
                          {row.daysToStockout}d
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <UrgencyBadge urgency={row.urgency} />
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {row.suggestedQty > 0 ? (
                        <span className="text-primary-700 dark:text-primary-400">{row.suggestedQty} u.</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {row.lastSupplierName ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
            {filteredRows.length} variantes &mdash; velocidad calculada sobre los ultimos {analysisDays} dias
          </div>
        </div>
      )}
    </div>
  );
}
