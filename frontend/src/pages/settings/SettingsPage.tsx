import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { API_BASE_URL, authFetch, authHeaders } from "../../lib/api";
import { PageHeader, Button, FormField, Badge, Modal } from "../../components/ui";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { thermalPrinter } from "../../lib/thermal-printer";
import { usePushNotifications } from "../../hooks/usePushNotifications";

type Attribute = {
  id: number;
  name: string;
  type: "TEXT" | "NUMBER" | "SELECT";
  options: string | null;
  sortOrder: number;
};

type IndustryProfile = {
  key: string;
  label: string;
  attributeCount: number;
};

const CURRENCIES = ["ARS", "USD", "MXN", "CLP", "COP", "EUR", "BRL", "PEN", "UYU"];
const INDUSTRY_TYPES = [
  { key: "GENERIC", label: "Genérico" },
  { key: "CLOTHING", label: "Indumentaria / Ropa" },
  { key: "HARDWARE", label: "Ferretería / Construcción" },
  { key: "PAINT", label: "Pinturería" },
  { key: "PHARMACY", label: "Farmacia / Salud" },
  { key: "FOOD", label: "Alimentos / Bebidas" },
  { key: "STATIONERY", label: "Librería / Papelería" },
  { key: "ELECTRONICS", label: "Electrónica / Tecnología" },
  { key: "FOOTWEAR", label: "Calzado" },
  { key: "AUTOMOTIVE", label: "Automotriz / Repuestos" },
];

type Tab = "company" | "attributes" | "billing" | "printer" | "payroll";

function parseOptions(options: string | null): string[] {
  if (!options) return [];
  try { return JSON.parse(options); } catch { return []; }
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, company, refetch } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("company");

  // --- Company tab state ---
  const [companyForm, setCompanyForm] = useState({
    name: company?.name ?? "",
    legalName: "",
    taxId: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    currency: "ARS",
    industryType: "GENERIC",
    lowStockAlerts: false,
    salesReportFreq: "NONE" as "NONE" | "DAILY" | "WEEKLY",
    artRate: 2.5,       // percentage
    unionRate: 2.0,     // percentage
    accountingEnabled: false,
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyFetched, setCompanyFetched] = useState(false);

  // --- Attributes tab state ---
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [attrLoading, setAttrLoading] = useState(false);
  const [profiles, setProfiles] = useState<IndustryProfile[]>([]);
  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);
  const [attrForm, setAttrForm] = useState({ name: "", type: "TEXT" as "TEXT" | "NUMBER" | "SELECT", options: "" });
  const [attrSaving, setAttrSaving] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: "", onConfirm: () => {} });
  const [applyingProfile, setApplyingProfile] = useState(false);

  const isOwner = user?.user.role === "OWNER";
  const push = usePushNotifications();

  // Load full company data
  useEffect(() => {
    if (companyFetched) return;
    authFetch(`${API_BASE_URL}/protected/company`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setCompanyForm({
            name: data.name ?? "",
            legalName: data.legalName ?? "",
            taxId: data.taxId ?? "",
            address: data.address ?? "",
            city: data.city ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            currency: data.currency ?? "ARS",
            industryType: data.industryType ?? "GENERIC",
            lowStockAlerts: data.lowStockAlerts ?? false,
            salesReportFreq: data.salesReportFreq ?? "NONE",
            artRate: (data.artRate ?? 0.025) * 100,
            unionRate: (data.unionRate ?? 0.02) * 100,
            accountingEnabled: data.accountingEnabled ?? false,
          });
          setCompanyFetched(true);
        }
      })
      .catch(() => {});
  }, [companyFetched]);

  // Load attributes
  useEffect(() => {
    if (tab !== "attributes") return;
    loadAttributes();
  }, [tab]);

  function loadAttributes() {
    setAttrLoading(true);
    authFetch(`${API_BASE_URL}/attributes`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setAttributes(Array.isArray(data) ? data : []))
      .catch(() => setAttributes([]))
      .finally(() => setAttrLoading(false));
  }

  function loadProfiles() {
    authFetch(`${API_BASE_URL}/attributes/profiles`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .catch(() => setProfiles([]));
  }

  async function saveCompany() {
    if (!companyForm.name.trim()) {
      showToast("El nombre de la empresa es obligatorio.", "error");
      return;
    }
    setCompanyLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/protected/company`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          ...companyForm,
          artRate: companyForm.artRate / 100,   // UI shows %, backend stores decimal
          unionRate: companyForm.unionRate / 100,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      showToast("Empresa actualizada correctamente.");
      refetch();
    } catch {
      showToast("Error al guardar los datos de la empresa.", "error");
    } finally {
      setCompanyLoading(false);
    }
  }

  function openNewAttr() {
    setEditingAttr(null);
    setAttrForm({ name: "", type: "TEXT", options: "" });
    setAttrModalOpen(true);
  }

  function openEditAttr(attr: Attribute) {
    setEditingAttr(attr);
    setAttrForm({ name: attr.name, type: attr.type, options: parseOptions(attr.options).join(", ") });
    setAttrModalOpen(true);
  }

  async function saveAttr() {
    if (!attrForm.name.trim()) {
      showToast("El nombre del atributo es obligatorio.", "error");
      return;
    }
    setAttrSaving(true);
    const optionsArr = attrForm.type === "SELECT"
      ? attrForm.options.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const body = { name: attrForm.name.trim(), type: attrForm.type, options: optionsArr };
    try {
      const url = editingAttr ? `${API_BASE_URL}/attributes/${editingAttr.id}` : `${API_BASE_URL}/attributes`;
      const method = editingAttr ? "PUT" : "POST";
      const res = await authFetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al guardar");
      }
      showToast(editingAttr ? "Atributo actualizado." : "Atributo creado.");
      setAttrModalOpen(false);
      loadAttributes();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al guardar.", "error");
    } finally {
      setAttrSaving(false);
    }
  }

  function deleteAttr(attr: Attribute) {
    setConfirmData({
      open: true,
      message: `¿Eliminar el atributo "${attr.name}"? Esta acción no se puede deshacer si no está en uso.`,
      onConfirm: () => _doDeleteAttr(attr),
    });
  }

  async function _doDeleteAttr(attr: Attribute) {
    try {
      const res = await authFetch(`${API_BASE_URL}/attributes/${attr.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al eliminar");
      }
      showToast("Atributo eliminado.");
      loadAttributes();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al eliminar.", "error");
    }
  }

  async function applyProfile(profileKey: string) {
    setApplyingProfile(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/attributes/apply-profile`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ profileKey }),
      });
      if (!res.ok) throw new Error("Error al aplicar perfil");
      const data = await res.json();
      showToast(`Perfil aplicado: ${data.created} atributos creados, ${data.skipped} ya existían.`);
      setProfileModalOpen(false);
      loadAttributes();
      refetch();
    } catch {
      showToast("Error al aplicar el perfil.", "error");
    } finally {
      setApplyingProfile(false);
    }
  }

  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerConnecting, setPrinterConnecting] = useState(false);

  const handlePrinterConnect = useCallback(async () => {
    setPrinterConnecting(true);
    try {
      await thermalPrinter.connect();
      setPrinterConnected(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("settings.thermalConnectError"), "error");
    } finally {
      setPrinterConnecting(false);
    }
  }, [showToast, t]);

  const handlePrinterDisconnect = useCallback(async () => {
    await thermalPrinter.disconnect();
    setPrinterConnected(false);
  }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: "company", label: t("settings.tabCompany") },
    { key: "attributes", label: t("settings.tabAttributes") },
    { key: "billing", label: t("settings.tabBilling") },
    { key: "printer", label: t("settings.tabPrinter") },
    { key: "payroll", label: "Sueldos" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.key
                ? "border-primary-600 text-primary-700 dark:text-primary-400 dark:border-primary-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Empresa */}
      {tab === "company" && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 space-y-5 max-w-2xl">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t("settings.companyTitle")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={`${t("settings.name")} *`}>
              <input
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.name}
                onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
            <FormField label={t("settings.legalName")}>
              <input
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.legalName}
                onChange={(e) => setCompanyForm((f) => ({ ...f, legalName: e.target.value }))}
              />
            </FormField>
            <FormField label={t("settings.taxId")}>
              <input
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.taxId}
                onChange={(e) => setCompanyForm((f) => ({ ...f, taxId: e.target.value }))}
              />
            </FormField>
            <FormField label={t("settings.phone")}>
              <input
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </FormField>
            <FormField label={t("settings.email")}>
              <input
                type="email"
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.email}
                onChange={(e) => setCompanyForm((f) => ({ ...f, email: e.target.value }))}
              />
            </FormField>
            <FormField label={t("settings.city")}>
              <input
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.city}
                onChange={(e) => setCompanyForm((f) => ({ ...f, city: e.target.value }))}
              />
            </FormField>
            <FormField label={t("settings.address")}>
              <input
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.address}
                onChange={(e) => setCompanyForm((f) => ({ ...f, address: e.target.value }))}
              />
            </FormField>
            <FormField label={t("settings.currency")}>
              <select
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.currency}
                onChange={(e) => setCompanyForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label={t("settings.industryType")}>
              <select
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.industryType}
                onChange={(e) => setCompanyForm((f) => ({ ...f, industryType: e.target.value }))}
              >
                {INDUSTRY_TYPES.map((it) => <option key={it.key} value={it.key}>{it.label}</option>)}
              </select>
            </FormField>
          </div>
          {/* Notifications */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t("settings.notificationsTitle")}</h4>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={companyForm.lowStockAlerts}
                onChange={(e) => setCompanyForm((f) => ({ ...f, lowStockAlerts: e.target.checked }))}
                disabled={!isOwner}
                className="mt-0.5 rounded border-gray-300 dark:border-gray-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("settings.lowStockAlerts")}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("settings.lowStockAlertsDesc")}</p>
              </div>
            </label>
            <FormField label={t("settings.salesReport")}>
              <select
                className="input-minimal w-full max-w-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={companyForm.salesReportFreq}
                onChange={(e) => setCompanyForm((f) => ({ ...f, salesReportFreq: e.target.value as "NONE" | "DAILY" | "WEEKLY" }))}
                disabled={!isOwner}
              >
                <option value="NONE">{t("settings.salesReportNone")}</option>
                <option value="DAILY">{t("settings.salesReportDaily")}</option>
                <option value="WEEKLY">{t("settings.salesReportWeekly")}</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("settings.salesReportDesc")}</p>
            </FormField>

            {/* Push notifications */}
            {push.state !== "unsupported" && (
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("settings.pushNotifications", "Notificaciones push")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {push.state === "denied"
                      ? t("settings.pushDenied", "El navegador bloqueó los permisos. Habilitá las notificaciones desde la configuración del sitio.")
                      : push.state === "subscribed"
                      ? t("settings.pushEnabled", "Las notificaciones están activas en este dispositivo.")
                      : t("settings.pushDesc", "Recibí alertas de stock bajo y resúmenes directamente en tu navegador.")}
                  </p>
                </div>
                {push.state !== "denied" && (
                  <button
                    type="button"
                    disabled={push.loading}
                    onClick={push.state === "subscribed" ? push.disable : push.enable}
                    className={[
                      "shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      push.state === "subscribed"
                        ? "bg-primary-600"
                        : "bg-gray-200 dark:bg-gray-600",
                      push.loading ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        push.state === "subscribed" ? "translate-x-6" : "translate-x-1",
                      ].join(" ")}
                    />
                  </button>
                )}
              </div>
            )}
          </div>

          {isOwner && (
            <div className="pt-2">
              <Button onClick={saveCompany} loading={companyLoading}>
                {t("settings.saveChanges")}
              </Button>
            </div>
          )}
          {!isOwner && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("settings.ownerOnly")}</p>
          )}
        </div>
      )}

      {/* TAB: Atributos */}
      {tab === "attributes" && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Los atributos definen qué campos tienen las variantes de tus productos (ej: Talle, Color, Litros, Medida).
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { loadProfiles(); setProfileModalOpen(true); }}>
                Usar perfil de industria
              </Button>
              {isOwner && (
                <Button onClick={openNewAttr}>
                  + Nuevo atributo
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            {attrLoading ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Cargando…</div>
            ) : attributes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay atributos definidos.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Creá atributos para que tus variantes tengan campos como Talle, Color, Litros, etc.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Opciones</th>
                    {isOwner && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {attributes.map((attr) => (
                    <tr key={attr.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{attr.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={attr.type === "SELECT" ? "info" : attr.type === "NUMBER" ? "warning" : "neutral"} size="sm">
                          {attr.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {parseOptions(attr.options).join(", ") || "—"}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => openEditAttr(attr)} className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                              Editar
                            </button>
                            <button type="button" onClick={() => deleteAttr(attr)} className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400">
                              Eliminar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB: Facturación */}
      {tab === "billing" && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 space-y-4 max-w-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Plan y facturación</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">Plan actual:</span>
            <Badge variant={company?.plan === "FREE" ? "neutral" : "success"}>
              {company?.plan ?? "FREE"}
            </Badge>
          </div>
          {company?.subscriptionStatus === "trialing" && company.trialEndsAt && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Prueba gratuita hasta: {new Date(company.trialEndsAt).toLocaleDateString("es-AR")}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            La gestión de planes y pagos estará disponible próximamente.
          </p>
          <a href="/app/plan" className="inline-flex text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
            Ver planes disponibles →
          </a>
        </div>
      )}

      {/* Printer tab */}
      {tab === "printer" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t("settings.thermalPrinter")}</h2>
          {!thermalPrinter.isSupported() ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
              {t("settings.thermalNotSupported")}
            </p>
          ) : printerConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {t("settings.thermalConnected")}
              </p>
              <button
                type="button"
                onClick={handlePrinterDisconnect}
                className="btn-secondary text-sm"
              >
                {t("settings.thermalDisconnect")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("settings.thermalDescription")}
              </p>
              <button
                type="button"
                onClick={handlePrinterConnect}
                disabled={printerConnecting}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {printerConnecting ? "…" : t("settings.thermalConnect")}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "payroll" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Configuracion de Sueldos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Porcentajes de aportes y contribuciones patronales. Se usan en el calculo automatico de liquidaciones.
          </p>

          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Aportes del empleado (fijos por ley)</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-slate-500">Jubilacion</p><p className="font-semibold">11%</p></div>
                <div><p className="text-slate-500">Obra Social</p><p className="font-semibold">3%</p></div>
                <div><p className="text-slate-500">INSSJP/PAMI</p><p className="font-semibold">3%</p></div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contribuciones patronales (fijas por ley)</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-slate-500">Jubilacion</p><p className="font-semibold">16%</p></div>
                <div><p className="text-slate-500">INSSJP/PAMI</p><p className="font-semibold">2%</p></div>
                <div><p className="text-slate-500">Obra Social</p><p className="font-semibold">6%</p></div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tasas configurables</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ART patronal (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    className="input-minimal w-full"
                    value={companyForm.artRate}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, artRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-slate-400 mt-1">Tipicamente 2-4%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cuota sindical (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    className="input-minimal w-full"
                    value={companyForm.unionRate}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, unionRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-slate-400 mt-1">Tipicamente 2-3%</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="accounting-enabled"
                checked={companyForm.accountingEnabled}
                onChange={(e) => setCompanyForm((f) => ({ ...f, accountingEnabled: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <div>
                <label htmlFor="accounting-enabled" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Asientos contables automaticos
                </label>
                <p className="text-xs text-slate-400">Al activar, cada venta y compra genera un asiento en el Libro Diario automaticamente.</p>
              </div>
            </div>
          </div>

          <Button onClick={saveCompany} loading={companyLoading}>
            Guardar configuracion
          </Button>
        </div>
      )}

      {/* Modal: Crear/Editar Atributo */}
      <Modal
        open={attrModalOpen}
        onClose={() => setAttrModalOpen(false)}
        title={editingAttr ? `Editar atributo: ${editingAttr.name}` : "Nuevo atributo"}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setAttrModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveAttr} loading={attrSaving}>
              {editingAttr ? "Guardar cambios" : "Crear atributo"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre *">
            <input
              className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              value={attrForm.name}
              onChange={(e) => setAttrForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ej: Talle, Color, Litros…"
              autoFocus
            />
          </FormField>
          <FormField label="Tipo">
            <select
              className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              value={attrForm.type}
              onChange={(e) => setAttrForm((f) => ({ ...f, type: e.target.value as "TEXT" | "NUMBER" | "SELECT" }))}
            >
              <option value="TEXT">Texto libre</option>
              <option value="NUMBER">Número</option>
              <option value="SELECT">Lista de opciones</option>
            </select>
          </FormField>
          {attrForm.type === "SELECT" && (
            <FormField label="Opciones (separadas por coma)" hint="ej: XS, S, M, L, XL">
              <input
                className="input-minimal w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={attrForm.options}
                onChange={(e) => setAttrForm((f) => ({ ...f, options: e.target.value }))}
                placeholder="Opción 1, Opción 2, Opción 3"
              />
            </FormField>
          )}
        </div>
      </Modal>

      {/* Modal: Aplicar perfil de industria */}
      <Modal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Aplicar perfil de industria"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Elegí un perfil para crear automáticamente los atributos típicos de tu industria.
            Los atributos existentes no serán eliminados.
          </p>
          {profiles.map((profile) => (
            <button
              key={profile.key}
              type="button"
              disabled={applyingProfile}
              onClick={() => applyProfile(profile.key)}
              className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile.label}</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                {profile.attributeCount === 0 ? "(sin atributos predefinidos)" : `${profile.attributeCount} atributo${profile.attributeCount !== 1 ? "s" : ""}`}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmModal
        open={confirmData.open}
        title="Eliminar atributo"
        message={confirmData.message}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={confirmData.onConfirm}
        onClose={() => setConfirmData((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
