import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";

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
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const url = `${API}/suppliers${q ? `?search=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setSuppliers(await res.json());
    } catch {
      addToast(t("suppliers.errorLoad"), "error");
    } finally {
      setLoading(false);
    }
  }, [t, addToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
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
      addToast(t("suppliers.nameRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
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
      addToast(editing ? t("suppliers.updated") : t("suppliers.created"), "success");
      setModalOpen(false);
      load(search || undefined);
    } catch (e: any) {
      addToast(e.message ?? t("suppliers.saveError"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(t("suppliers.deleteConfirm", { name: s.name }))) return;
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`${API}/suppliers/${s.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      addToast(t("suppliers.deleted"), "success");
      load(search || undefined);
    } catch {
      addToast(t("suppliers.deleteError"), "error");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("suppliers.title")}
        subtitle={t("suppliers.subtitle")}
        action={{ label: t("suppliers.new"), onClick: openCreate }}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("suppliers.searchPlaceholder")}
      />

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400">{t("suppliers.loading")}</p>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <p className="text-lg">{t("suppliers.empty")}</p>
          <p className="text-sm mt-1">{t("suppliers.emptyHint")}</p>
        </div>
      ) : (
        <div className="table-modern">
          <table>
            <thead>
              <tr>
                <th>{t("suppliers.colName")}</th>
                <th>{t("suppliers.colTaxId")}</th>
                <th>{t("suppliers.colPhone")}</th>
                <th>{t("suppliers.colEmail")}</th>
                <th>{t("suppliers.colCity")}</th>
                <th>{t("suppliers.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td className="text-slate-500 dark:text-slate-400">{s.taxId ?? "—"}</td>
                  <td className="text-slate-500 dark:text-slate-400">{s.phone ?? "—"}</td>
                  <td className="text-slate-500 dark:text-slate-400">{s.email ?? "—"}</td>
                  <td className="text-slate-500 dark:text-slate-400">{s.city ?? "—"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="text-xs btn-secondary py-1 px-3"
                      >
                        {t("suppliers.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 py-1 px-2"
                      >
                        {t("suppliers.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-minimal w-full"
                  autoFocus
                />
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
    </div>
  );
}
