import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLAN_INFO = {
  FREE: {
    name: "Free",
    priceLabel: "Gratis",
    color: "gray",
    limits: { branches: 1, users: 5, products: 1000, monthlySales: 100 },
    features: ["1 sucursal", "5 usuarios", "1.000 productos", "100 ventas/mes"],
  },
  PRO: {
    name: "Pro",
    priceLabel: "$100.000 ARS/mes",
    color: "primary",
    limits: { branches: 5, users: null, products: null, monthlySales: null },
    features: ["5 sucursales", "Usuarios ilimitados", "Productos ilimitados", "Ventas ilimitadas", "Soporte por email"],
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceLabel: "$200.000 ARS/mes",
    color: "indigo",
    limits: { branches: null, users: null, products: null, monthlySales: null },
    features: ["Sucursales ilimitadas", "Usuarios ilimitados", "Productos ilimitados", "Ventas ilimitadas", "Soporte prioritario", "Onboarding dedicado"],
  },
} as const;

type PlanKey = "FREE" | "PRO" | "ENTERPRISE";

interface Usage {
  plan: PlanKey;
  usage: { branches: number; users: number; products: number; monthlySales: number };
  limits: { branches: number | null; users: number | null; products: number | null; monthlySales: number | null };
}

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number | null }) {
  if (limit === null) return null;
  const pct = Math.min(100, Math.round((current / limit) * 100));
  const danger = pct >= 90;
  const warn = pct >= 70;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{label}</span>
        <span className={danger ? "text-red-600 font-semibold" : warn ? "text-yellow-600" : ""}>
          {current} / {limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${danger ? "bg-red-500" : warn ? "bg-yellow-400" : "bg-primary-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Checkout modal ───────────────────────────────────────────────────────────

function CheckoutModal({
  planKey,
  onClose,
}: {
  planKey: "PRO" | "ENTERPRISE";
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<"mp" | "stripe" | null>(null);
  const plan = PLAN_INFO[planKey];

  async function checkout(provider: "mp" | "stripe") {
    setLoading(provider);
    try {
      const res = await authFetch(`${API_BASE_URL}/billing/subscribe`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, provider }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "NOT_CONFIGURED") {
          showToast("El procesador de pagos no está configurado aún. Contactá al administrador.", "info");
        } else {
          showToast(data.message ?? "Error al iniciar el pago", "error");
        }
        return;
      }

      // Redirigir al checkout externo
      window.location.href = data.url;
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Suscribirse al plan {plan.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.priceLabel}</p>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          Elegí tu método de pago preferido. Serás redirigido a la plataforma de pago correspondiente.
        </p>

        <div className="space-y-3">
          {/* MercadoPago */}
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => checkout("mp")}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-[#009EE3] bg-[#009EE3]/10 hover:bg-[#009EE3]/20 px-4 py-3 transition-colors disabled:opacity-50"
          >
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#009EE3" />
              <path d="M10 24.5C10 24.5 14.5 16 24 16C33.5 16 38 24.5 38 24.5" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <circle cx="24" cy="24.5" r="4" fill="white" />
            </svg>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#009EE3]">
                {loading === "mp" ? "Redirigiendo…" : "Pagar con MercadoPago"}
              </p>
              <p className="text-xs text-gray-500">Tarjeta, transferencia, efectivo</p>
            </div>
          </button>

          {/* Stripe */}
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => checkout("stripe")}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-[#635BFF] bg-[#635BFF]/10 hover:bg-[#635BFF]/20 px-4 py-3 transition-colors disabled:opacity-50"
          >
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#635BFF" />
              <path d="M21 18c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2h3l-1 10H19l-1-10h3v-2z" fill="white" />
            </svg>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#635BFF]">
                {loading === "stripe" ? "Redirigiendo…" : "Pagar con tarjeta (Stripe)"}
              </p>
              <p className="text-xs text-gray-500">Visa, Mastercard, Amex</p>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── PlanPage ─────────────────────────────────────────────────────────────────

export function PlanPage() {
  const { t } = useTranslation();
  const { company } = useAuth();
  const { showToast } = useToast();

  const [exporting, setExporting] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"PRO" | "ENTERPRISE" | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const plansRef = useRef<HTMLDivElement>(null);

  const currentPlan = (company?.plan ?? "FREE") as PlanKey;
  const trialEndsAt = company?.trialEndsAt ? new Date(company.trialEndsAt) : null;
  const now = new Date();
  const isTrialing = company?.subscriptionStatus === "trialing" && trialEndsAt && trialEndsAt > now;
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)) : 0;
  const trialEnded = trialEndsAt && trialEndsAt < now && currentPlan === "FREE";
  const hasStripe = !!company?.stripeCustomerId;

  // Fetch usage on mount
  useEffect(() => {
    authFetch(`${API_BASE_URL}/billing/usage`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setUsage(data))
      .catch(() => {});
  }, []);

  // Check for payment status in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_status") === "success" || params.get("mp_status") === "success") {
      showToast("¡Suscripción activada! Tu plan fue actualizado.", "success");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [showToast]);

  const handleStripePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/billing/portal`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) window.location.href = data.url;
      else showToast(data.message ?? "Error al abrir el portal", "error");
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleExportData = useCallback(async () => {
    setExporting(true);
    try {
      const [productsRes, branchesRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/products`, { headers: authHeaders() }),
        authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() }),
      ]);
      if (!productsRes.ok || !branchesRes.ok) throw new Error(t("plan.exportError"));
      const products = await productsRes.json();
      const branches = await branchesRes.json();

      const to = new Date();
      const from = new Date(to);
      from.setFullYear(from.getFullYear() - 1);
      const salesRes = await authFetch(
        `${API_BASE_URL}/sales?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`,
        { headers: authHeaders() }
      );
      const sales = salesRes.ok ? await salesRes.json() : [];

      const inventoryRows: Record<string, string | number>[] = [];
      for (const branch of branches) {
        const invRes = await authFetch(`${API_BASE_URL}/inventory?branchId=${branch.id}`, { headers: authHeaders() });
        if (!invRes.ok) continue;
        for (const row of await invRes.json()) {
          inventoryRows.push({
            Sucursal: branch.name, SKU: row.variant?.sku ?? "",
            Producto: row.variant?.product?.name ?? "", Cantidad: row.quantity ?? 0,
          });
        }
      }

      const productRows = products.flatMap((p: { name: string; category?: string; brand?: string; variants?: { sku: string; price: unknown; costPrice?: unknown }[] }) =>
        (p.variants || []).map((v) => ({
          Producto: p.name, Categoría: p.category ?? "", Marca: p.brand ?? "",
          SKU: v.sku, Precio: Number(v.price ?? 0),
        }))
      );

      const saleRows = (sales || []).map((s: { id: number; createdAt: string; totalAmount: unknown; paymentMethod: string; branch?: { name: string } }) => ({
        ID: s.id, Fecha: new Date(s.createdAt).toLocaleString("es-AR"),
        Sucursal: s.branch?.name ?? "", Total: Number(s.totalAmount ?? 0), Medio: s.paymentMethod,
      }));

      const wb = XLSX.utils.book_new();
      if (productRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "Productos");
      if (inventoryRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryRows), "Inventario");
      if (saleRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(saleRows), "Ventas");
      if (!productRows.length && !inventoryRows.length && !saleRows.length) {
        showToast(t("plan.noDataExport"), "info"); return;
      }
      XLSX.writeFile(wb, `backup-giro-${to.toISOString().slice(0, 10)}.xlsx`);
      showToast(t("plan.exportSuccess"));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("plan.exportError"), "error");
    } finally {
      setExporting(false);
    }
  }, [showToast, t]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("plan.title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("plan.subtitle")}</p>
      </div>

      {/* Trial / expirado banner */}
      {trialEnded && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">{t("plan.trialEnded")}</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">Elegí un plan para seguir usando GIRO.</p>
          </div>
          <button type="button" onClick={() => plansRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="shrink-0 text-sm font-medium text-red-700 dark:text-red-300 hover:underline">
            Ver planes →
          </button>
        </div>
      )}
      {isTrialing && (
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Estás en período de prueba. <strong>{trialDaysLeft} día(s)</strong> restantes.
          </p>
        </div>
      )}

      {/* Plan actual + uso */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("plan.currentPlan")}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{PLAN_INFO[currentPlan].name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{PLAN_INFO[currentPlan].priceLabel}</p>
            {company?.currentPeriodEnd && (
              <p className="text-xs text-gray-400 mt-0.5">
                Próximo cobro: {new Date(company.currentPeriodEnd).toLocaleDateString("es-AR")}
              </p>
            )}
          </div>
        </div>

        {/* Usage meters */}
        {usage && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2.5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Uso este mes</p>
            <UsageBar label="Sucursales" current={usage.usage.branches} limit={usage.limits.branches} />
            <UsageBar label="Usuarios activos" current={usage.usage.users} limit={usage.limits.users} />
            <UsageBar label="Productos activos" current={usage.usage.products} limit={usage.limits.products} />
            <UsageBar label="Ventas del mes" current={usage.usage.monthlySales} limit={usage.limits.monthlySales} />
          </div>
        )}

        {/* Stripe portal */}
        {hasStripe && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              disabled={portalLoading}
              onClick={handleStripePortal}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
            >
              {portalLoading ? "Redirigiendo…" : "Administrar suscripción (Stripe)"}
            </button>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("plan.exportTitle")}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("plan.exportDescription")}</p>
        <button type="button" onClick={handleExportData} disabled={exporting}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
          {exporting ? t("plan.exporting") : t("plan.exportButton")}
        </button>
      </div>

      {/* Planes */}
      <div ref={plansRef} className="scroll-mt-4 space-y-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("plan.choosePlan")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["FREE", "PRO", "ENTERPRISE"] as PlanKey[]).map((key) => {
            const info = PLAN_INFO[key];
            const isCurrent = currentPlan === key;
            return (
              <div key={key} className={[
                "rounded-xl border p-5 flex flex-col",
                isCurrent
                  ? "border-primary-300 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
              ].join(" ")}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white">{info.name}</h3>
                  {isCurrent && (
                    <span className="text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-0.5 rounded-full">
                      Actual
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{info.priceLabel}</p>
                <ul className="flex-1 space-y-1.5 mb-4">
                  {info.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && key !== "FREE" && (
                  <button
                    type="button"
                    onClick={() => setCheckoutPlan(key)}
                    className="w-full py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                  >
                    Suscribirme
                  </button>
                )}
                {key === "FREE" && !isCurrent && (
                  <p className="text-xs text-gray-400 text-center mt-auto">Cancelá tu plan para volver a Free</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout modal */}
      {checkoutPlan && (
        <CheckoutModal planKey={checkoutPlan} onClose={() => setCheckoutPlan(null)} />
      )}
    </div>
  );
}
