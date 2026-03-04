import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { Tooltip } from "../components/Tooltip";
import { IconCurrency, IconSearch, IconShoppingCart, IconPlus, IconMinus, IconX } from "../components/Icons";

type Branch = { id: number; name: string; code: string };

type VariantWithStock = {
  productVariantId: number;
  productName: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  price: string;
  availableQty: number;
};

type InventoryRow = {
  id: number;
  quantity: number;
  branch: { id: number; name: string; code: string };
  variant: {
    id: number;
    size: string;
    color: string;
    sku: string;
    barcode: string | null;
    price: { toString(): string };
    product: { name: string };
  };
};

const PAYMENT_METHODS = [
  { value: "CASH" as const, label: "Efectivo" },
  { value: "CARD" as const, label: "Tarjeta" },
  { value: "MIXED" as const, label: "Mixto" },
  { value: "OTHER" as const, label: "Otro" },
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  MIXED: "Mixto",
  OTHER: "Otro",
};

const MAX_SUGGESTIONS = 10;

type SaleListItem = {
  id: number;
  totalAmount: string | number;
  totalItems: number;
  paymentMethod: string;
  createdAt: string;
  branch: { id: number; name: string; code: string };
  user: { id: number; fullName: string; username: string };
};

type SalesTab = "pos" | "historial";

export function SalesPage() {
  const [activeTab, setActiveTab] = useState<SalesTab>("pos");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [cart, setCart] = useState<Array<{ productVariantId: number; quantity: number }>>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethodToConfirm, setPaymentMethodToConfirm] = useState<"CASH" | "CARD" | "MIXED" | "OTHER">("CASH");
  const [mixedCash, setMixedCash] = useState("");
  const [mixedCard, setMixedCard] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [mixedCashReceived, setMixedCashReceived] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [historyBranchId, setHistoryBranchId] = useState<string>("");
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [historyTo, setHistoryTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [historySales, setHistorySales] = useState<SaleListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar sucursales");
      const data = await res.json();
      setBranches(data);
      if (data.length && branchId === "") setBranchId(data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    if (typeof branchId !== "number") return;
    setError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory?branchId=${branchId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Error al cargar inventario");
      const data = await res.json();
      setInventory(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, [branchId]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (typeof branchId === "number") loadInventory();
    else setInventory([]);
  }, [branchId, loadInventory]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const params = new URLSearchParams();
      if (historyBranchId) params.set("branchId", historyBranchId);
      if (historyFrom) params.set("from", historyFrom);
      if (historyTo) params.set("to", historyTo);
      const res = await authFetch(`${API_BASE_URL}/sales?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar historial");
      const data = await res.json();
      setHistorySales(data);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Error");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyBranchId, historyFrom, historyTo]);

  useEffect(() => {
    if (activeTab === "historial") loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cargar al entrar a la pestaña; "Filtrar" llama loadHistory
  }, [activeTab]);

  const variantsWithStock: VariantWithStock[] = useMemo(() => {
    return inventory
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        productVariantId: row.variant.id,
        productName: row.variant.product.name,
        sku: row.variant.sku,
        barcode: row.variant.barcode,
        size: row.variant.size,
        color: row.variant.color,
        price: typeof row.variant.price === "object" && row.variant.price !== null && "toString" in row.variant.price
          ? (row.variant.price as { toString(): string }).toString()
          : String(row.variant.price),
        availableQty: row.quantity,
      }));
  }, [inventory]);

  const searchTerm = searchInput.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!searchTerm) return variantsWithStock.slice(0, MAX_SUGGESTIONS);
    const term = searchTerm;
    return variantsWithStock
      .filter(
        (v) =>
          v.productName.toLowerCase().includes(term) ||
          v.sku.toLowerCase().includes(term) ||
          (v.barcode && v.barcode.toLowerCase().includes(term))
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [variantsWithStock, searchTerm]);

  const addToCart = useCallback(
    (variantId: number, quantity: number) => {
      const add = Math.max(1, quantity || 1);
      setCart((c) => {
        const i = c.findIndex((x) => x.productVariantId === variantId);
        if (i >= 0) {
          const next = [...c];
          next[i] = { ...next[i], quantity: next[i].quantity + add };
          return next;
        }
        return [...c, { productVariantId: variantId, quantity: add }];
      });
      setSearchInput("");
      setShowSuggestions(false);
      searchInputRef.current?.focus();
    },
    []
  );

  const updateCartQty = useCallback((index: number, delta: number) => {
    setCart((c) => {
      const next = [...c];
      const newQty = next[index].quantity + delta;
      if (newQty < 1) return c.filter((_, i) => i !== index);
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  }, []);

  const removeFromCart = (index: number) => {
    setCart((c) => c.filter((_, i) => i !== index));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!searchTerm) return;
    const byBarcode = variantsWithStock.find(
      (v) => v.barcode && v.barcode.trim().toLowerCase() === searchTerm
    );
    if (byBarcode) {
      addToCart(byBarcode.productVariantId, 1);
      return;
    }
    if (suggestions.length === 1) {
      addToCart(suggestions[0].productVariantId, 1);
      return;
    }
    if (suggestions.length > 1) {
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(ev.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(ev.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalItems = cart.reduce((s, x) => s + x.quantity, 0);
  const totalAmount = cart.reduce((s, item) => {
    const v = variantsWithStock.find((x) => x.productVariantId === item.productVariantId);
    if (!v) return s;
    return s + parseFloat(v.price) * item.quantity;
  }, 0);

  const confirmSale = async (method: "CASH" | "CARD" | "MIXED" | "OTHER", mixedBreakdown?: { cash: number; card: number }) => {
    if (cart.length === 0 || !branchId) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const amount = cart.reduce((s, item) => {
        const v = variantsWithStock.find((x) => x.productVariantId === item.productVariantId);
        return s + (v ? parseFloat(v.price) * item.quantity : 0);
      }, 0);
      const body: Record<string, unknown> = {
          branchId: Number(branchId),
          paymentMethod: method,
          items: cart,
        };
      if (method === "MIXED" && mixedBreakdown) {
        body.paymentCashAmount = mixedBreakdown.cash;
        body.paymentCardAmount = mixedBreakdown.card;
      }
      const res = await authFetch(`${API_BASE_URL}/sales`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al registrar venta");
      let msg = `Venta registrada. Total cobrado: $${amount.toFixed(2)}`;
      if (method === "MIXED" && mixedBreakdown) {
        msg += ` (Efectivo $${mixedBreakdown.cash.toFixed(2)}, Tarjeta $${mixedBreakdown.card.toFixed(2)})`;
      }
      setSuccess(msg);
      setCart([]);
      setShowPaymentModal(false);
      setMixedCash("");
      setMixedCard("");
      setCashReceived("");
      setMixedCashReceived("");
      searchInputRef.current?.focus();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <span className="inline-block w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
          Cargando punto de venta…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab("pos")}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
            activeTab === "pos"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Punto de venta
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
            activeTab === "historial"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Historial
        </button>
      </nav>

      {activeTab === "historial" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sucursal</label>
              <select
                value={historyBranchId}
                onChange={(e) => setHistoryBranchId(e.target.value)}
                className="input-minimal min-w-[180px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              >
                <option value="">Todas</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
              <input
                type="date"
                value={historyFrom}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="input-minimal dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
              <input
                type="date"
                value={historyTo}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="input-minimal dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <button type="button" onClick={loadHistory} className="btn-secondary text-sm">
              Filtrar
            </button>
          </div>
          {historyError && (
            <p className="text-sm text-red-600 dark:text-red-400">{historyError}</p>
          )}
          <div className="table-modern">
            {historyLoading ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                Cargando historial…
              </div>
            ) : historySales.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                <p>No hay ventas en el período seleccionado.</p>
                <p className="mt-1 text-xs opacity-90">Probá otro rango de fechas o sucursal.</p>
              </div>
            ) : (
              <table className="min-w-[520px]">
                <thead>
                  <tr>
                    <th className="font-medium">Fecha y hora</th>
                    <th className="font-medium">Sucursal</th>
                    <th className="font-medium">Total</th>
                    <th className="font-medium">Ítems</th>
                    <th className="font-medium">Pago</th>
                    <th className="font-medium">Vendedor</th>
                  </tr>
                </thead>
                <tbody>
                  {historySales.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {new Date(s.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td>{s.branch.name} ({s.branch.code})</td>
                      <td className="font-medium">${Number(s.totalAmount).toFixed(2)}</td>
                      <td>{s.totalItems}</td>
                      <td>{PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}</td>
                      <td>{s.user.fullName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Sucursal + buscar producto */}
      <div className="space-y-6">
        <Tooltip content="Las ventas y el stock se registran para esta sucursal">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Sucursal</label>
            <select
              value={branchId === "" ? "" : String(branchId)}
              onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
              className="input-minimal max-w-xs text-base py-2.5 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="">Seleccionar sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </Tooltip>

        {typeof branchId === "number" && (
          <div className="space-y-3">
            <Tooltip content="Escribí nombre o SKU para buscar, o pasá el escáner y apretá Enter">
              <label className="block text-sm font-medium text-slate-600">Buscar producto</label>
            </Tooltip>
            <div className="relative">
              <div className="relative">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Nombre, SKU o código de barras…"
                  className="input-minimal w-full pl-12 pr-5 py-4 text-lg dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                  autoComplete="off"
                />
              </div>
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 z-20 mt-2 rounded-xl border border-slate-200 bg-white shadow-lg max-h-80 overflow-y-auto"
              >
                {showSuggestions && (suggestions.length > 0 || searchTerm) && (
                  <>
                    {suggestions.length === 0 ? (
                      <div className="px-5 py-5 text-base text-slate-500">
                        No hay coincidencias con stock en esta sucursal.
                      </div>
                    ) : (
                      <ul className="p-2 space-y-1">
                        {suggestions.map((v) => (
                          <li key={v.productVariantId}>
                            <button
                              type="button"
                              onClick={() => addToCart(v.productVariantId, 1)}
                              className="w-full text-left px-5 py-4 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 flex justify-between items-center gap-4 transition-colors text-base"
                            >
                              <span className="font-medium text-slate-800">
                                {v.productName} · {v.size} / {v.color}
                              </span>
                              <span className="text-sm text-slate-500 shrink-0">
                                ${v.price} · Stock: {v.availableQty}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carrito debajo del buscar */}
      <div>
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-700/50 px-5 py-4 border-b border-slate-200 dark:border-slate-600 flex items-center gap-3">
              <IconShoppingCart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Carrito</h2>
              {totalItems > 0 && (
                <span className="ml-auto text-base font-medium text-slate-500 dark:text-slate-400">{totalItems} ítem{totalItems !== 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                    <IconShoppingCart className="w-8 h-8" />
                  </div>
                  <p className="text-base text-slate-500 leading-relaxed">
                    Escaneá o buscá un producto para agregarlo al carrito.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {cart.map((item, i) => {
                    const v = variantsWithStock.find((x) => x.productVariantId === item.productVariantId);
                    const price = v ? parseFloat(v.price) : 0;
                    const subtotal = price * item.quantity;
                    return (
                      <li key={`${item.productVariantId}-${i}`} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-slate-800 truncate">
                            {v ? `${v.productName} · ${v.sku}` : `ID ${item.productVariantId}`}
                          </p>
                          <p className="text-sm text-slate-500 mt-0.5">
                            ${price.toFixed(2)} × {item.quantity} = ${subtotal.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Tooltip content="Menos una unidad">
                            <button
                              type="button"
                              onClick={() => updateCartQty(i, -1)}
                              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                              <IconMinus className="w-5 h-5" />
                            </button>
                          </Tooltip>
                          <span className="min-w-[2rem] text-center text-base font-medium text-slate-700">{item.quantity}</span>
                          <Tooltip content="Más una unidad">
                            <button
                              type="button"
                              onClick={() => updateCartQty(i, 1)}
                              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                              <IconPlus className="w-5 h-5" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Quitar del carrito">
                            <button
                              type="button"
                              onClick={() => removeFromCart(i)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <IconX className="w-5 h-5" />
                            </button>
                          </Tooltip>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-base font-medium text-slate-600">Total a cobrar</span>
                    <span className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-5 border-t border-slate-200">
                  <Tooltip content="Elegí el método de pago en el siguiente paso">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethodToConfirm("CASH");
                        setMixedCash("");
                        setMixedCard("");
                        setCashReceived(totalAmount.toFixed(2));
                        setMixedCashReceived("");
                        setShowPaymentModal(true);
                      }}
                      disabled={submitting || cart.length === 0 || !branchId}
                      className="btn-primary w-full py-4 text-lg font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <IconCurrency className="w-6 h-6" />
                      Cobrar
                    </button>
                  </Tooltip>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-base text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-base text-emerald-800">
              {success}
            </div>
          )}
        </div>
      </div>

      {/* Modal: método de pago y confirmar venta */}
      {showPaymentModal && (() => {
        const cashNum = parseFloat(mixedCash) || 0;
        const cardNum = parseFloat(mixedCard) || 0;
        const mixedSum = Math.round((cashNum + cardNum) * 100) / 100;
        const totalRounded = Math.round(totalAmount * 100) / 100;
        const mixedValid = paymentMethodToConfirm !== "MIXED" || (mixedSum === totalRounded && cashNum >= 0 && cardNum >= 0);
        const cashReceivedNum = parseFloat(cashReceived) || 0;
        const cashChange = Math.round((cashReceivedNum - totalRounded) * 100) / 100;
        const cashValid = paymentMethodToConfirm !== "CASH" || cashReceivedNum >= totalRounded;
        const mixedCashReceivedNum = parseFloat(mixedCashReceived) || 0;
        const mixedCashChange = Math.round((mixedCashReceivedNum - cashNum) * 100) / 100;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl p-6 space-y-6">
              <h2 id="payment-modal-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                ¿Cómo cobrás?
              </h2>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Total: ${totalAmount.toFixed(2)}
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Medio de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setPaymentMethodToConfirm(m.value);
                        if (m.value === "CASH") setCashReceived(totalRounded.toFixed(2));
                      }}
                      className={`py-3 px-4 rounded-xl border-2 text-base font-medium transition-colors ${
                        paymentMethodToConfirm === m.value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-500"
                          : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethodToConfirm === "CASH" && (
                <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Monto recibido del cliente ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={totalRounded.toFixed(2)}
                    className="input-minimal text-lg font-semibold"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Exacto", value: totalRounded },
                      { label: "+10", value: totalRounded + 10 },
                      { label: "+20", value: totalRounded + 20 },
                      { label: "+50", value: totalRounded + 50 },
                      { label: "+100", value: totalRounded + 100 },
                    ].map(({ label, value }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setCashReceived(value.toFixed(2))}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-500"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className={`text-lg font-bold ${cashChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                    {cashChange >= 0 ? `Vuelto: $${cashChange.toFixed(2)}` : `Falta: $${Math.abs(cashChange).toFixed(2)}`}
                  </p>
                </div>
              )}

              {paymentMethodToConfirm === "MIXED" && (
                <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Desglose del cobro (si ponés uno, el resto se completa en el otro)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Efectivo ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={mixedCash}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMixedCash(val);
                          const n = parseFloat(val) || 0;
                          const rest = Math.round(Math.max(0, totalAmount - n) * 100) / 100;
                          setMixedCard(rest > 0 ? rest.toFixed(2) : "");
                        }}
                        placeholder="0.00"
                        className="input-minimal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tarjeta ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={mixedCard}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMixedCard(val);
                          const n = parseFloat(val) || 0;
                          const rest = Math.round(Math.max(0, totalAmount - n) * 100) / 100;
                          setMixedCash(rest > 0 ? rest.toFixed(2) : "");
                        }}
                        placeholder="0.00"
                        className="input-minimal"
                      />
                    </div>
                  </div>
                  <p className={`text-sm ${mixedSum === totalRounded ? "text-slate-600 dark:text-slate-400" : "text-amber-600 dark:text-amber-400"}`}>
                    Suma: ${mixedSum.toFixed(2)}
                    {mixedSum === totalRounded && " ✓"}
                    {mixedSum !== totalRounded && ` (falta $${(totalRounded - mixedSum).toFixed(2)})`}
                  </p>
                  {cashNum > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-500 space-y-2">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Monto recibido en efectivo ($) — para calcular vuelto</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={mixedCashReceived}
                        onChange={(e) => setMixedCashReceived(e.target.value)}
                        placeholder={cashNum.toFixed(2)}
                        className="input-minimal"
                      />
                      {mixedCashReceivedNum > 0 && (
                        <p className={`text-sm font-semibold ${mixedCashChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                          {mixedCashChange >= 0 ? `Vuelto efectivo: $${mixedCashChange.toFixed(2)}` : `Falta en efectivo: $${Math.abs(mixedCashChange).toFixed(2)}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setCashReceived("");
                    setMixedCashReceived("");
                  }}
                  className="flex-1 btn-secondary py-3 text-base font-medium dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    confirmSale(
                      paymentMethodToConfirm,
                      paymentMethodToConfirm === "MIXED"
                        ? { cash: cashNum, card: cardNum }
                        : undefined
                    )
                  }
                  disabled={submitting || !mixedValid || !cashValid}
                  className="flex-1 btn-primary py-3 text-base font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconCurrency className="w-5 h-5" />
                  {submitting ? "Procesando…" : "Confirmar venta"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
      )}
    </div>
  );
}
