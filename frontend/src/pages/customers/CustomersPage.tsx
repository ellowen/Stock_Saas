import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";
import { useSortable } from "../../hooks/useSortable";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg className={`w-3.5 h-3.5 ml-1 inline-block transition-opacity ${active ? "opacity-100" : "opacity-30 group-hover:opacity-60"}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {active && dir === "desc"
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />}
    </svg>
  );
}

const API = "/api";

interface Customer {
  id: number;
  name: string;
  taxId?: string;
  taxType?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  notes?: string;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: "",
  taxId: "",
  taxType: "CUIT",
  address: "",
  city: "",
  email: "",
  phone: "",
  notes: "",
};

interface SaleHistory {
  id: number;
  totalAmount: string;
  totalItems: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: { quantity: number; unitPrice: string; totalPrice: string; variant: { sku: string | null; size: string; color: string; product: { name: string } } }[];
}

export default function CustomersPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { sorted: sortedCustomers, sortKey, sortDir, toggle } = useSortable(customers, "name");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<{ totalSpent: number; count: number; sales: SaleHistory[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async (c: Customer) => {
    setHistoryCustomer(c);
    setHistory(null);
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/customers/${c.id}/sales`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setHistory(await res.json());
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  };

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const url = `${API}/customers${q ? `?search=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setCustomers(await res.json());
    } catch {
      showToast(t("customers.errorLoad"), "error");
    } finally {
      setLoading(false);
    }
  }, [t, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormTouched(false);
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setFormTouched(false);
    setEditing(c);
    setForm({
      name: c.name,
      taxId: c.taxId ?? "",
      taxType: c.taxType ?? "CUIT",
      address: c.address ?? "",
      city: c.city ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      notes: c.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast(t("customers.nameRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const body = {
        name: form.name.trim(),
        taxId: form.taxId || undefined,
        taxType: form.taxType || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      };
      const url = editing ? `${API}/customers/${editing.id}` : `${API}/customers`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      showToast(editing ? t("customers.updated") : t("customers.created"), "success");
      setModalOpen(false);
      load(search || undefined);
    } catch (e: any) {
      showToast(e.message ?? t("customers.saveError"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Customer) {
    if (!confirm(t("customers.deleteConfirm", { name: c.name }))) return;
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`${API}/customers/${c.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(t("customers.deleted"), "success");
      setSelected((s) => { const n = new Set(s); n.delete(c.id); return n; });
      load(search || undefined);
    } catch {
      showToast(t("customers.deleteError"), "error");
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Eliminar ${selected.size} cliente${selected.size !== 1 ? "s" : ""}?`)) return;
    setBulkDeleting(true);
    const token = localStorage.getItem("accessToken");
    let errors = 0;
    for (const id of selected) {
      try {
        await fetch(`${API}/customers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      } catch { errors++; }
    }
    setSelected(new Set());
    if (errors > 0) showToast(`${errors} clientes no pudieron eliminarse`, "error");
    else showToast(`${selected.size} clientes eliminados`, "success");
    load(search || undefined);
    setBulkDeleting(false);
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("customers.title")}
        subtitle={t("customers.subtitle")}
        actions={<button type="button" onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">{t("customers.new")}</button>}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("customers.searchPlaceholder")}
      />

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-700/40 animate-pulse" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t("customers.empty")}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">{t("customers.emptyHint")}</p>
          <button type="button" onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("customers.new")}
          </button>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {sortedCustomers.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</p>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => openHistory(c)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline px-2 py-1">Historial</button>
                    <button type="button" onClick={() => openEdit(c)} className="text-xs text-slate-500 dark:text-slate-400 hover:underline px-2 py-1">{t("customers.edit")}</button>
                    <button type="button" onClick={() => handleDelete(c)} className="text-xs text-red-500 dark:text-red-400 hover:underline px-2 py-1">{t("customers.delete")}</button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                  {c.taxId && <span>{c.taxType ?? ""} {c.taxId}</span>}
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.city && <span>{c.city}</span>}
                </div>
              </div>
            ))}
          </div>
          {/* Bulk action toolbar */}
          {selected.size > 0 && (
            <div className="hidden sm:flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white px-4 py-2.5 shadow-lg">
              <span className="text-sm font-medium">{selected.size} seleccionado{selected.size !== 1 ? "s" : ""}</span>
              <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting}
                className="ml-auto text-sm text-red-300 hover:text-red-200 disabled:opacity-50">
                {bulkDeleting ? "Eliminando..." : "Eliminar seleccionados"}
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-sm text-slate-300 hover:text-white">Cancelar</button>
            </div>
          )}
          {/* Desktop table */}
          <div className="hidden sm:block table-modern">
            <table>
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox"
                      className="rounded border-slate-300 dark:border-slate-600"
                      checked={selected.size === sortedCustomers.length && sortedCustomers.length > 0}
                      onChange={(e) => setSelected(e.target.checked ? new Set(sortedCustomers.map((c) => c.id)) : new Set())}
                    />
                  </th>
                  {([
                    ["name", t("customers.colName")],
                    ["taxId", t("customers.colTaxId")],
                    ["phone", t("customers.colPhone")],
                    ["email", t("customers.colEmail")],
                    ["city", t("customers.colCity")],
                  ] as [keyof Customer, string][]).map(([col, label]) => (
                    <th key={col}>
                      <button type="button" onClick={() => toggle(col)}
                        className="group inline-flex items-center text-left font-semibold hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        {label}
                        <SortIcon active={sortKey === col} dir={sortDir} />
                      </button>
                    </th>
                  ))}
                  <th>{t("customers.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.map((c) => (
                  <tr key={c.id} className={`group ${selected.has(c.id) ? "bg-primary-50 dark:bg-primary-900/10" : ""}`}>
                    <td>
                      <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600"
                        checked={selected.has(c.id)}
                        onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(c.id) : n.delete(c.id); return n; })}
                      />
                    </td>
                    <td className="font-medium">{c.name}</td>
                    <td className="text-slate-500 dark:text-slate-400">
                      {c.taxId ? `${c.taxType ?? ""} ${c.taxId}`.trim() : "—"}
                    </td>
                    <td className="text-slate-500 dark:text-slate-400">{c.phone ?? "—"}</td>
                    <td className="text-slate-500 dark:text-slate-400">{c.email ?? "—"}</td>
                    <td className="text-slate-500 dark:text-slate-400">{c.city ?? "—"}</td>
                    <td>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openHistory(c)} className="text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded px-2 py-1">Historial</button>
                        <button type="button" onClick={() => openEdit(c)} className="text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1">{t("customers.edit")}</button>
                        <button type="button" onClick={() => handleDelete(c)} className="text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded px-2 py-1">{t("customers.delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Historial de compras */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{historyCustomer.name}</h2>
                {history && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {history.count} compra{history.count !== 1 ? "s" : ""} &mdash; Total gastado: <strong>${Number(history.totalSpent).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
                  </p>
                )}
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {historyLoading ? (
                <p className="text-sm text-slate-400 text-center py-8">Cargando historial...</p>
              ) : !history || history.sales.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Este cliente no tiene compras registradas.</p>
              ) : (
                history.sales.map((sale) => (
                  <div key={sale.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-700/40 px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Venta #{sale.id}</span>
                        <span className="text-xs text-slate-500">{new Date(sale.createdAt).toLocaleDateString("es-AR")}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sale.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          sale.status === "REFUNDED"  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-slate-100 text-slate-500"
                        }`}>{sale.status}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        ${Number(sale.totalAmount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sale.items.map((item, i) => (
                        <div key={i} className="px-4 py-2 flex justify-between text-sm">
                          <span className="text-slate-700 dark:text-slate-300">
                            {item.quantity}x {item.variant.product.name}
                            {(item.variant.size || item.variant.color) && (
                              <span className="text-slate-400 ml-1">({[item.variant.size, item.variant.color].filter(Boolean).join(" / ")})</span>
                            )}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            ${Number(item.totalPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {editing ? t("customers.editTitle") : t("customers.createTitle")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("customers.fieldName")} *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormTouched(true); }}
                  onBlur={() => setFormTouched(true)}
                  className={`input-minimal w-full ${formTouched && !form.name.trim() ? "border-red-400 dark:border-red-500 focus:ring-red-400" : ""}`}
                  autoFocus
                />
                {formTouched && !form.name.trim() && (
                  <p className="text-xs text-red-500 mt-1">{t("customers.nameRequired")}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("customers.fieldTaxType")}
                </label>
                <select
                  value={form.taxType}
                  onChange={(e) => setForm({ ...form, taxType: e.target.value })}
                  className="input-minimal w-full"
                >
                  <option value="CUIT">CUIT</option>
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                  <option value="NIT">NIT</option>
                  <option value="">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("customers.fieldTaxId")}
                </label>
                <input
                  type="text"
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                  className="input-minimal w-full"
                  placeholder="20-12345678-9"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("customers.fieldPhone")}
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-minimal w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("customers.fieldEmail")}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-minimal w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("customers.fieldAddress")}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input-minimal w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("customers.fieldCity")}
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input-minimal w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("customers.fieldNotes")}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-minimal w-full"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn-secondary py-2 px-4 text-sm"
              >
                {t("customers.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary py-2 px-4 text-sm"
              >
                {saving ? t("customers.saving") : t("customers.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
