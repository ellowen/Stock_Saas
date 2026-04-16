import { useEffect, useState, useCallback } from "react";
import { getAccessToken } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
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

interface Supplier {
  id: number;
  name: string;
  taxId?: string;
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
  address: "",
  city: "",
  email: "",
  phone: "",
  notes: "",
};

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { sorted: sortedSuppliers, sortKey, sortDir, toggle } = useSortable(suppliers, "name");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: "", onConfirm: () => {} });
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const url = `${API}/suppliers${q ? `?search=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setSuppliers(await res.json());
    } catch {
      showToast(t("suppliers.errorLoad"), "error");
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
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setFormTouched(false);
    setFormErrors({});
    setEditing(s);
    setForm({
      name: s.name,
      taxId: s.taxId ?? "",
      address: s.address ?? "",
      city: s.city ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      notes: s.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast(t("suppliers.nameRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      const token = getAccessToken();
      const body = {
        name: form.name.trim(),
        taxId: form.taxId || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      };
      const url = editing ? `${API}/suppliers/${editing.id}` : `${API}/suppliers`;
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
      showToast(editing ? t("suppliers.updated") : t("suppliers.created"), "success");
      setModalOpen(false);
      load(search || undefined);
    } catch (e: any) {
      showToast(e.message ?? t("suppliers.saveError"), "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(s: Supplier) {
    setConfirmData({
      open: true,
      message: t("suppliers.deleteConfirm", { name: s.name }),
      onConfirm: () => _doDelete(s),
    });
  }

  async function _doDelete(s: Supplier) {
    try {
      const token = getAccessToken();
      await fetch(`${API}/suppliers/${s.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(t("suppliers.deleted"), "success");
      load(search || undefined);
    } catch {
      showToast(t("suppliers.deleteError"), "error");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("suppliers.title")}
        subtitle={t("suppliers.subtitle")}
        actions={<button type="button" onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">{t("suppliers.new")}</button>}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("suppliers.searchPlaceholder")}
      />

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-700/40 animate-pulse" />)}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM4 4h12l2 4H2V4zM2 8h16l1 5H1L2 8z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t("suppliers.empty")}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">{t("suppliers.emptyHint")}</p>
          <button type="button" onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("suppliers.new")}
          </button>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {sortedSuppliers.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => openEdit(s)} className="text-xs text-slate-500 dark:text-slate-400 hover:underline px-2 py-1">{t("suppliers.edit")}</button>
                    <button type="button" onClick={() => handleDelete(s)} className="text-xs text-red-500 dark:text-red-400 hover:underline px-2 py-1">{t("suppliers.delete")}</button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                  {s.taxId && <span>{s.taxId}</span>}
                  {s.phone && <span>{s.phone}</span>}
                  {s.email && <span>{s.email}</span>}
                  {s.city && <span>{s.city}</span>}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block table-modern">
            <table>
              <thead>
                <tr>
                  {([
                    ["name", t("suppliers.colName")],
                    ["taxId", t("suppliers.colTaxId")],
                    ["phone", t("suppliers.colPhone")],
                    ["email", t("suppliers.colEmail")],
                    ["city", t("suppliers.colCity")],
                  ] as [keyof Supplier, string][]).map(([col, label]) => (
                    <th key={col}>
                      <button type="button" onClick={() => toggle(col)}
                        className="group inline-flex items-center text-left font-semibold hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        {label}
                        <SortIcon active={sortKey === col} dir={sortDir} />
                      </button>
                    </th>
                  ))}
                  <th>{t("suppliers.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedSuppliers.map((s) => (
                  <tr key={s.id} className="group">
                    <td className="font-medium">{s.name}</td>
                    <td className="text-slate-500 dark:text-slate-400">{s.taxId ?? "—"}</td>
                    <td className="text-slate-500 dark:text-slate-400">{s.phone ?? "—"}</td>
                    <td className="text-slate-500 dark:text-slate-400">{s.email ?? "—"}</td>
                    <td className="text-slate-500 dark:text-slate-400">{s.city ?? "—"}</td>
                    <td>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEdit(s)} className="text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1">{t("suppliers.edit")}</button>
                        <button type="button" onClick={() => handleDelete(s)} className="text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded px-2 py-1">{t("suppliers.delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {editing ? t("suppliers.editTitle") : t("suppliers.createTitle")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("suppliers.fieldName")} *
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
                  <p className="text-xs text-red-500 mt-1">{t("suppliers.nameRequired")}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("suppliers.fieldTaxId")}
                </label>
                <input
                  type="text"
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                  className="input-minimal w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("suppliers.fieldPhone")}
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
                  {t("suppliers.fieldEmail")}
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
                  {t("suppliers.fieldAddress")}
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
                  {t("suppliers.fieldCity")}
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
                  {t("suppliers.fieldNotes")}
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
                {t("suppliers.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary py-2 px-4 text-sm"
              >
                {saving ? t("suppliers.saving") : t("suppliers.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmData.open}
        title={t("suppliers.deleteTitle", { defaultValue: "Eliminar proveedor" })}
        message={confirmData.message}
        confirmLabel={t("common.delete", { defaultValue: "Eliminar" })}
        variant="danger"
        onConfirm={confirmData.onConfirm}
        onClose={() => setConfirmData((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
