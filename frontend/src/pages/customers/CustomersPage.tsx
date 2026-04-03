import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";

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

export default function CustomersPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const url = `${API}/customers${q ? `?search=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setCustomers(await res.json());
    } catch {
      addToast(t("customers.errorLoad"), "error");
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

  function openEdit(c: Customer) {
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
      addToast(t("customers.nameRequired"), "error");
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
      addToast(editing ? t("customers.updated") : t("customers.created"), "success");
      setModalOpen(false);
      load(search || undefined);
    } catch (e: any) {
      addToast(e.message ?? t("customers.saveError"), "error");
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
      addToast(t("customers.deleted"), "success");
      load(search || undefined);
    } catch {
      addToast(t("customers.deleteError"), "error");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("customers.title")}
        subtitle={t("customers.subtitle")}
        action={{ label: t("customers.new"), onClick: openCreate }}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("customers.searchPlaceholder")}
      />

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400">{t("customers.loading")}</p>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <p className="text-lg">{t("customers.empty")}</p>
          <p className="text-sm mt-1">{t("customers.emptyHint")}</p>
        </div>
      ) : (
        <div className="table-modern">
          <table>
            <thead>
              <tr>
                <th>{t("customers.colName")}</th>
                <th>{t("customers.colTaxId")}</th>
                <th>{t("customers.colPhone")}</th>
                <th>{t("customers.colEmail")}</th>
                <th>{t("customers.colCity")}</th>
                <th>{t("customers.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-slate-500 dark:text-slate-400">
                    {c.taxId ? `${c.taxType ?? ""} ${c.taxId}`.trim() : "—"}
                  </td>
                  <td className="text-slate-500 dark:text-slate-400">{c.phone ?? "—"}</td>
                  <td className="text-slate-500 dark:text-slate-400">{c.email ?? "—"}</td>
                  <td className="text-slate-500 dark:text-slate-400">{c.city ?? "—"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="text-xs btn-secondary py-1 px-3"
                      >
                        {t("customers.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 py-1 px-2"
                      >
                        {t("customers.delete")}
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
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-minimal w-full"
                  autoFocus
                />
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
