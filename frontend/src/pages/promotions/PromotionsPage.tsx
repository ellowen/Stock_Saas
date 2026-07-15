import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAccessToken } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

const API = "/api";

type PromotionType = "PERCENT_OFF" | "BUY_X_GET_Y_FREE";
type PromotionScope = "ALL" | "PRODUCT" | "CATEGORY";

interface Promotion {
  id: number;
  name: string;
  type: PromotionType;
  scope: PromotionScope;
  productId: number | null;
  product?: { id: number; name: string } | null;
  category: string | null;
  percentOff: number | null;
  buyQty: number | null;
  freeQty: number | null;
  couponCode: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const EMPTY_FORM = {
  name: "",
  type: "PERCENT_OFF" as PromotionType,
  scope: "ALL" as PromotionScope,
  productId: "" as number | "",
  category: "",
  percentOff: "", // se ingresa 0-100, se guarda como fraccion
  buyQty: "",
  freeQty: "",
  couponCode: "",
  isActive: true,
};

function describe(p: Promotion, t: (k: string, opts?: any) => string): string {
  if (p.type === "PERCENT_OFF") {
    return t("promotions.descPercent", { pct: Math.round((p.percentOff ?? 0) * 100) });
  }
  return t("promotions.descBuyXGetY", { buy: p.buyQty, free: p.freeQty });
}

function scopeLabel(p: Promotion, t: (k: string) => string): string {
  if (p.scope === "PRODUCT") return p.product?.name ?? t("promotions.scopeProduct");
  if (p.scope === "CATEGORY") return p.category ?? t("promotions.scopeCategory");
  return t("promotions.scopeAll");
}

export default function PromotionsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("PRODUCTS_WRITE");

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [confirmData, setConfirmData] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: "", onConfirm: () => {} });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API}/promotions`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setPromotions(await res.json());
    } catch {
      showToast(t("promotions.errorLoad"), "error");
    } finally {
      setLoading(false);
    }
  }, [t, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API}/products`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProducts(Array.isArray(data) ? data.map((p: any) => ({ id: p.id, name: p.name })) : []))
      .catch(() => {});
    fetch(`${API}/products/categories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(p: Promotion) {
    setEditing(p);
    setForm({
      name: p.name,
      type: p.type,
      scope: p.scope,
      productId: p.productId ?? "",
      category: p.category ?? "",
      percentOff: p.percentOff != null ? String(Math.round(p.percentOff * 100)) : "",
      buyQty: p.buyQty != null ? String(p.buyQty) : "",
      freeQty: p.freeQty != null ? String(p.freeQty) : "",
      couponCode: p.couponCode ?? "",
      isActive: p.isActive,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast(t("promotions.nameRequired"), "error");
      return;
    }
    if (form.type === "PERCENT_OFF" && !form.percentOff) {
      showToast(t("promotions.percentRequired"), "error");
      return;
    }
    if (form.type === "BUY_X_GET_Y_FREE" && (!form.buyQty || !form.freeQty)) {
      showToast(t("promotions.buyXGetYRequired"), "error");
      return;
    }
    if (form.scope === "PRODUCT" && !form.productId) {
      showToast(t("promotions.productRequired"), "error");
      return;
    }
    if (form.scope === "CATEGORY" && !form.category) {
      showToast(t("promotions.categoryRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      const token = getAccessToken();
      const body = {
        name: form.name.trim(),
        type: form.type,
        scope: form.scope,
        productId: form.scope === "PRODUCT" ? Number(form.productId) : null,
        category: form.scope === "CATEGORY" ? form.category : null,
        percentOff: form.type === "PERCENT_OFF" ? Number(form.percentOff) / 100 : null,
        buyQty: form.type === "BUY_X_GET_Y_FREE" ? Number(form.buyQty) : null,
        freeQty: form.type === "BUY_X_GET_Y_FREE" ? Number(form.freeQty) : null,
        couponCode: form.couponCode.trim() || null,
        isActive: form.isActive,
      };
      const url = editing ? `${API}/promotions/${editing.id}` : `${API}/promotions`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      showToast(editing ? t("promotions.updated") : t("promotions.created"), "success");
      setModalOpen(false);
      load();
    } catch (e: any) {
      showToast(e.message ?? t("promotions.saveError"), "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(p: Promotion) {
    setConfirmData({
      open: true,
      message: t("promotions.deleteConfirm", { name: p.name }),
      onConfirm: () => _doDelete(p),
    });
  }

  async function _doDelete(p: Promotion) {
    try {
      const token = getAccessToken();
      await fetch(`${API}/promotions/${p.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      showToast(t("promotions.deleted"), "success");
      load();
    } catch {
      showToast(t("promotions.deleteError"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("promotions.title")}
        subtitle={t("promotions.subtitle")}
        actions={
          canManage && (
            <button type="button" onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
              {t("promotions.new")}
            </button>
          )
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-700/40 animate-pulse" />)}
        </div>
      ) : promotions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t("promotions.empty")}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">{t("promotions.emptyHint")}</p>
        </div>
      ) : (
        <div className="table-modern hidden sm:block">
          <table>
            <thead>
              <tr>
                <th>{t("promotions.colName")}</th>
                <th>{t("promotions.colWhat")}</th>
                <th>{t("promotions.colScope")}</th>
                <th>{t("promotions.colCoupon")}</th>
                <th>{t("promotions.colStatus")}</th>
                {canManage && <th>{t("promotions.colActions")}</th>}
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p.id} className="group">
                  <td className="font-medium">{p.name}</td>
                  <td className="text-slate-500 dark:text-slate-400">{describe(p, t)}</td>
                  <td className="text-slate-500 dark:text-slate-400">{scopeLabel(p, t)}</td>
                  <td className="text-slate-500 dark:text-slate-400 font-mono text-xs">{p.couponCode ?? "—"}</td>
                  <td>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                      {p.isActive ? t("promotions.active") : t("promotions.inactive")}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEdit(p)} className="text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1">{t("promotions.edit")}</button>
                        <button type="button" onClick={() => handleDelete(p)} className="text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded px-2 py-1">{t("promotions.delete")}</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {editing ? t("promotions.editTitle") : t("promotions.createTitle")}
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldName")} *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-minimal w-full" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldType")}</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PromotionType })} className="input-minimal w-full">
                  <option value="PERCENT_OFF">{t("promotions.typePercent")}</option>
                  <option value="BUY_X_GET_Y_FREE">{t("promotions.typeBuyXGetY")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldScope")}</label>
                <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as PromotionScope })} className="input-minimal w-full">
                  <option value="ALL">{t("promotions.scopeAll")}</option>
                  <option value="PRODUCT">{t("promotions.scopeProduct")}</option>
                  <option value="CATEGORY">{t("promotions.scopeCategory")}</option>
                </select>
              </div>
            </div>

            {form.scope === "PRODUCT" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldProduct")} *</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value ? Number(e.target.value) : "" })} className="input-minimal w-full">
                  <option value="">{t("promotions.selectProduct")}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {form.scope === "CATEGORY" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldCategory")} *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-minimal w-full">
                  <option value="">{t("promotions.selectCategory")}</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {form.type === "PERCENT_OFF" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldPercent")} *</label>
                <input type="number" min={1} max={100} value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: e.target.value })} className="input-minimal w-full" placeholder="20" />
              </div>
            )}
            {form.type === "BUY_X_GET_Y_FREE" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldBuyQty")} *</label>
                  <input type="number" min={1} value={form.buyQty} onChange={(e) => setForm({ ...form, buyQty: e.target.value })} className="input-minimal w-full" placeholder={t("promotions.buyQtyHint2x1")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldFreeQty")} *</label>
                  <input type="number" min={1} value={form.freeQty} onChange={(e) => setForm({ ...form, freeQty: e.target.value })} className="input-minimal w-full" placeholder="1" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("promotions.fieldCoupon")}</label>
              <input type="text" value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })} className="input-minimal w-full font-mono" placeholder={t("promotions.couponPlaceholder")} />
              <p className="text-xs text-slate-400 mt-1">{t("promotions.couponHint")}</p>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="promo-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-slate-300" />
              <label htmlFor="promo-active" className="text-sm text-slate-700 dark:text-slate-300">{t("promotions.fieldActive")}</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary py-2 px-4 text-sm">{t("promotions.cancel")}</button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary py-2 px-4 text-sm">
                {saving ? t("promotions.saving") : t("promotions.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmData.open}
        message={confirmData.message}
        confirmLabel={t("promotions.delete")}
        variant="danger"
        onConfirm={confirmData.onConfirm}
        onClose={() => setConfirmData((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
