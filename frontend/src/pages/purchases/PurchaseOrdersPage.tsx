import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";

const API = "/api";

type POStatus = "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

interface PurchaseOrder {
  id: number;
  number: number;
  status: POStatus;
  date: string;
  expectedAt?: string;
  notes?: string;
  total: number | string;
  supplier?: { id: number; name: string };
  branch?: { id: number; name: string; code: string };
  user?: { id: number; fullName: string };
  _count?: { items: number };
}

interface PODetail extends PurchaseOrder {
  items: Array<{
    id: number;
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    received: number | string;
    variantId?: number;
    variant?: { sku: string; product?: { name: string } };
  }>;
}

interface Branch { id: number; name: string; code: string }
interface Supplier { id: number; name: string }

interface ItemRow {
  variantId?: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  PARTIALLY_RECEIVED: "Parcialmente recibido",
  RECEIVED: "Recibido",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<POStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  RECEIVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const EMPTY_ITEM: ItemRow = { description: "", quantity: "1", unitPrice: "0" };

export default function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"list" | "new">("list");

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<POStatus | "">("");
  const [filterSupplier, setFilterSupplier] = useState<number | "">("");

  // New order form
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [expectedAt, setExpectedAt] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);

  // Receive modal
  const [receiveOrder, setReceiveOrder] = useState<PODetail | null>(null);
  const [receivedQtys, setReceivedQtys] = useState<Record<number, string>>({});
  const [receiving, setReceiving] = useState(false);
  // Print modal
  const [printOrder, setPrintOrder] = useState<PODetail | null>(null);

  async function openPrint(id: number) {
    try {
      const res = await fetch(`${API}/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error();
      setPrintOrder(await res.json());
    } catch { showToast("Error al cargar OC", "error"); }
  }

  const authHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSupplier) params.set("supplierId", String(filterSupplier));
      const res = await fetch(`${API}/purchase-orders?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error();
      setOrders(await res.json());
    } catch {
      showToast(t("purchases.errorLoad"), "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSupplier, t, showToast]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/branches`, { headers: h }).then((r) => r.json()),
      fetch(`${API}/suppliers`, { headers: h }).then((r) => r.json()),
    ]).then(([b, s]) => {
      setBranches(Array.isArray(b) ? b : []);
      setSuppliers(Array.isArray(s) ? s : []);
    }).catch(() => {});
  }, []);

  function addItem() { setItems((prev) => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const total = items.reduce((s, item) => s + parseFloat(item.unitPrice || "0") * parseFloat(item.quantity || "0"), 0);

  async function handleSubmit() {
    if (!branchId || !supplierId) { showToast(t("purchases.suppBranchRequired"), "error"); return; }
    if (!items[0].description.trim()) { showToast(t("purchases.itemsRequired"), "error"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/purchase-orders`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({
          branchId,
          supplierId,
          expectedAt: expectedAt || undefined,
          notes: formNotes || undefined,
          items: items.map((item) => ({
            variantId: item.variantId,
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
          })),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      showToast(t("purchases.created"), "success");
      setTab("list");
      loadOrders();
      setItems([{ ...EMPTY_ITEM }]);
      setBranchId(""); setSupplierId(""); setExpectedAt(""); setFormNotes("");
    } catch (e: any) {
      showToast(e.message ?? t("purchases.saveError"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function openReceive(id: number) {
    try {
      const res = await fetch(`${API}/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error();
      const order: PODetail = await res.json();
      setReceiveOrder(order);
      const qtys: Record<number, string> = {};
      order.items.forEach((item) => {
        const remaining = Number(item.quantity) - Number(item.received);
        qtys[item.id] = String(Math.max(0, remaining));
      });
      setReceivedQtys(qtys);
    } catch {
      showToast(t("purchases.errorLoad"), "error");
    }
  }

  async function handleReceive() {
    if (!receiveOrder) return;
    setReceiving(true);
    try {
      const res = await fetch(`${API}/purchase-orders/${receiveOrder.id}/receive`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({
          items: receiveOrder.items.map((item) => ({
            itemId: item.id,
            received: parseFloat(receivedQtys[item.id] ?? "0") || 0,
          })),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      showToast(t("purchases.received"), "success");
      setReceiveOrder(null);
      loadOrders();
    } catch (e: any) {
      showToast(e.message ?? t("purchases.receiveError"), "error");
    } finally {
      setReceiving(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm(t("purchases.cancelConfirm"))) return;
    try {
      await fetch(`${API}/purchase-orders/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      showToast(t("purchases.cancelled"), "success");
      loadOrders();
    } catch {
      showToast(t("purchases.cancelError"), "error");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader title={t("purchases.title")} subtitle={t("purchases.subtitle")} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-600">
        {(["list", "new"] as const).map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tb
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            {tb === "list" ? t("purchases.tabList") : t("purchases.tabNew")}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as POStatus | "")}
              className="input-minimal text-sm"
            >
              <option value="">{t("purchases.allStatuses")}</option>
              {(Object.keys(STATUS_LABELS) as POStatus[]).map((st) => (
                <option key={st} value={st}>{STATUS_LABELS[st]}</option>
              ))}
            </select>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value ? Number(e.target.value) : "")}
              className="input-minimal text-sm"
            >
              <option value="">{t("purchases.allSuppliers")}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-slate-500 dark:text-slate-400">{t("purchases.loading")}</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <p>{t("purchases.empty")}</p>
            </div>
          ) : (
            <div className="table-modern">
              <table>
                <thead>
                  <tr>
                    <th>{t("purchases.colNumber")}</th>
                    <th>{t("purchases.colSupplier")}</th>
                    <th>{t("purchases.colBranch")}</th>
                    <th>{t("purchases.colDate")}</th>
                    <th>{t("purchases.colExpected")}</th>
                    <th>{t("purchases.colTotal")}</th>
                    <th>{t("purchases.colStatus")}</th>
                    <th>{t("purchases.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-sm">OC-{String(order.number).padStart(6, "0")}</td>
                      <td>{order.supplier?.name ?? "—"}</td>
                      <td className="text-slate-500 dark:text-slate-400">{order.branch?.name ?? "—"}</td>
                      <td className="text-slate-500 dark:text-slate-400">{new Date(order.date).toLocaleDateString("es-AR")}</td>
                      <td className="text-slate-500 dark:text-slate-400">
                        {order.expectedAt ? new Date(order.expectedAt).toLocaleDateString("es-AR") : "—"}
                      </td>
                      <td className="font-medium">${Number(order.total).toFixed(2)}</td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2 flex-wrap">
                          <button type="button" onClick={() => openPrint(order.id)}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline py-1 px-2">
                            Imprimir
                          </button>
                          {(order.status === "DRAFT" || order.status === "SENT" || order.status === "PARTIALLY_RECEIVED") && (
                            <button
                              type="button"
                              onClick={() => openReceive(order.id)}
                              className="text-xs btn-primary py-1 px-3"
                            >
                              {t("purchases.actionReceive")}
                            </button>
                          )}
                          {order.status !== "RECEIVED" && order.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => handleCancel(order.id)}
                              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 py-1 px-2"
                            >
                              {t("purchases.actionCancel")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "new" && (
        <div className="space-y-6 max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("purchases.supplierLabel")} *
              </label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")} className="input-minimal w-full">
                <option value="">{t("purchases.selectSupplier")}</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("purchases.branchLabel")} *
              </label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")} className="input-minimal w-full">
                <option value="">{t("purchases.selectBranch")}</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("purchases.expectedLabel")}</label>
              <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} className="input-minimal w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("purchases.notesLabel")}</label>
              <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="input-minimal w-full" />
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t("purchases.itemsLabel")}</p>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
                <span className="col-span-6">{t("purchases.colItemDesc")}</span>
                <span className="col-span-2 text-right">{t("purchases.colItemQty")}</span>
                <span className="col-span-3 text-right">{t("purchases.colItemPrice")}</span>
                <span className="col-span-1" />
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input type="text" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder={t("purchases.itemDescPlaceholder")} className="input-minimal text-sm col-span-6" />
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} min={0.001} step={0.001} className="input-minimal text-sm col-span-2 text-right" />
                  <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} min={0} step={0.01} className="input-minimal text-sm col-span-3 text-right" />
                  <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1} className="col-span-1 text-red-500 hover:text-red-700 text-lg leading-none disabled:opacity-30">×</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium">
              + {t("purchases.addItem")}
            </button>
          </div>

          <div className="flex justify-end">
            <div className="w-44 text-sm space-y-1">
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-1">
                <span className="font-semibold">{t("purchases.total")}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setTab("list")} className="btn-secondary py-2.5 px-5">{t("purchases.cancel")}</button>
            <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary py-2.5 px-6">
              {submitting ? t("purchases.creating") : t("purchases.create")}
            </button>
          </div>
        </div>
      )}

      {/* Receive modal */}
      {receiveOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("purchases.receiveTitle")} — OC-{String(receiveOrder.number).padStart(6, "0")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("purchases.receiveHint")}</p>
            <div className="space-y-3">
              {receiveOrder.items.map((item) => {
                const pending = Number(item.quantity) - Number(item.received);
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("purchases.ordered")}: {Number(item.quantity)} · {t("purchases.alreadyReceived")}: {Number(item.received)} · {t("purchases.pending")}: {Math.max(0, pending)}
                      </p>
                    </div>
                    <input
                      type="number"
                      value={receivedQtys[item.id] ?? "0"}
                      onChange={(e) => setReceivedQtys((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      min={0}
                      max={pending}
                      step={0.001}
                      className="input-minimal w-24 text-right text-sm"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setReceiveOrder(null)} className="btn-secondary py-2 px-4 text-sm">{t("purchases.cancel")}</button>
              <button type="button" onClick={handleReceive} disabled={receiving} className="btn-primary py-2 px-4 text-sm">
                {receiving ? t("purchases.receiving") : t("purchases.confirmReceive")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Print modal */}
      {printOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 shrink-0 no-print">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Orden de Compra OC-{String(printOrder.number).padStart(6, "0")}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="btn-primary text-sm py-1.5 px-4">Imprimir</button>
                <button onClick={() => setPrintOrder(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-6 print-receipt-zone">
              <div className="space-y-5 text-sm">
                {/* Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Proveedor</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{printOrder.supplier?.name ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">OC N.</p>
                    <p className="font-mono font-bold text-gray-900 dark:text-gray-100">OC-{String(printOrder.number).padStart(6, "0")}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(printOrder.date).toLocaleDateString("es-AR")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sucursal destino</p>
                    <p className="text-gray-700 dark:text-gray-300">{printOrder.branch?.name ?? "—"}</p>
                  </div>
                  {printOrder.expectedAt && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Entrega estimada</p>
                      <p className="text-gray-700 dark:text-gray-300">{new Date(printOrder.expectedAt).toLocaleDateString("es-AR")}</p>
                    </div>
                  )}
                </div>
                {/* Items table */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {["Descripcion", "Cant.", "Precio unit.", "Subtotal"].map((h) => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {printOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.description}</td>
                          <td className="px-4 py-2 font-mono text-gray-700 dark:text-gray-300">{Number(item.quantity)}</td>
                          <td className="px-4 py-2 font-mono text-gray-700 dark:text-gray-300">${Number(item.unitPrice).toFixed(2)}</td>
                          <td className="px-4 py-2 font-mono font-medium text-gray-900 dark:text-gray-100">
                            ${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Total:</td>
                        <td className="px-4 py-2 font-mono font-bold text-gray-900 dark:text-gray-100">
                          ${Number(printOrder.total).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {printOrder.notes && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notas</p>
                    <p className="text-gray-700 dark:text-gray-300">{printOrder.notes}</p>
                  </div>
                )}
                {/* Signature lines */}
                <div className="grid grid-cols-2 gap-8 pt-8">
                  <div className="border-t border-gray-400 pt-2 text-center text-xs text-gray-400">Firma proveedor</div>
                  <div className="border-t border-gray-400 pt-2 text-center text-xs text-gray-400">Firma recepcion</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
