import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

function getPlanLabels(t: (k: string) => string): Record<string, string> {
  return {
    FREE: t("plan.planFree"),
    PRO: t("plan.planPro"),
    ENTERPRISE: t("plan.planEnterprise"),
  };
}

function getPlansConfig(t: (k: string) => string) {
  return [
    { id: "FREE", nameKey: "plan.freeName", descriptionKey: "plan.freeDescription", price: null, ctaKey: null, limitsKey: "plan.freeLimits" },
    { id: "PRO", nameKey: "plan.proName", descriptionKey: "plan.proDescription", priceKey: "plan.proPrice", ctaKey: "plan.proCta", limitsKey: "plan.proLimits" },
    { id: "ENTERPRISE", nameKey: "plan.entName", descriptionKey: "plan.entDescription", priceKey: "plan.entPrice", ctaKey: "plan.entCta", limitsKey: "plan.entLimits" },
  ];
}

export function PlanPage() {
  const { t } = useTranslation();
  const { company } = useAuth();
  const { showToast } = useToast();
  const PLAN_LABELS = getPlanLabels(t);
  const PLANS_CONFIG = getPlansConfig(t);
  const [exporting, setExporting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentPlanId, setPaymentPlanId] = useState<string | null>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const plan = company?.plan ?? "FREE";
  const trialEndsAt = company?.trialEndsAt ? new Date(company.trialEndsAt) : null;
  const isTrialing = company?.subscriptionStatus === "trialing" && trialEndsAt && trialEndsAt > new Date();
  const now = new Date();
  const trialEnded = trialEndsAt && trialEndsAt < now;
  const trialEndingSoon = trialEndsAt && !trialEnded && trialEndsAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

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
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);
      const salesRes = await authFetch(`${API_BASE_URL}/sales?from=${fromStr}&to=${toStr}`, { headers: authHeaders() });
      const sales = salesRes.ok ? await salesRes.json() : [];

      const inventoryRows: Array<Record<string, string | number>> = [];
      for (const branch of branches) {
        const invRes = await authFetch(`${API_BASE_URL}/inventory?branchId=${branch.id}`, { headers: authHeaders() });
        if (!invRes.ok) continue;
        const inv = await invRes.json();
        for (const row of inv) {
          inventoryRows.push({
            Sucursal: branch.name,
            Código: branch.code,
            SKU: row.variant?.sku ?? "",
            Producto: row.variant?.product?.name ?? "",
            Talle: row.variant?.size ?? "",
            Color: row.variant?.color ?? "",
            Cantidad: row.quantity ?? 0,
            "Mínimo (opc.)": row.minStock ?? "",
          });
        }
      }

      const productRows: Array<Record<string, string | number>> = [];
      for (const p of products) {
        for (const v of p.variants || []) {
          productRows.push({
            Producto: p.name,
            Categoría: p.category ?? "",
            Marca: p.brand ?? "",
            SKU: v.sku ?? "",
            Talle: v.size ?? "",
            Color: v.color ?? "",
            Precio: Number(v.price ?? 0),
            "Costo (opc.)": v.costPrice != null ? Number(v.costPrice) : "",
          });
        }
      }

      const saleRows = (sales || []).map((s: { id: number; createdAt: string; totalAmount: unknown; totalItems: number; paymentMethod: string; branch?: { name: string }; user?: { fullName: string } }) => ({
        ID: s.id,
        Fecha: new Date(s.createdAt).toLocaleString("es-AR"),
        Sucursal: s.branch?.name ?? "",
        Total: Number(s.totalAmount ?? 0),
        Ítems: s.totalItems ?? 0,
        Medio: s.paymentMethod ?? "",
        Usuario: s.user?.fullName ?? "",
      }));

      const wb = XLSX.utils.book_new();
      if (productRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "Productos");
      if (inventoryRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryRows), "Inventario");
      if (saleRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(saleRows), "Ventas");
      if (productRows.length === 0 && inventoryRows.length === 0 && saleRows.length === 0) {
        showToast(t("plan.noDataExport"), "info");
        return;
      }
      XLSX.writeFile(wb, `backup-giro-${toStr}.xlsx`);
      showToast(t("plan.exportSuccess"));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("plan.exportError"), "error");
    } finally {
      setExporting(false);
    }
  }, [showToast, t]);

  const openPaymentModal = (planId: string) => {
    setPaymentPlanId(planId);
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentPlanId(null);
  };

  const handleChoosePlan = () => {
    showToast(t("plan.paymentComing"), "info");
    closePaymentModal();
  };

  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t("plan.title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("plan.subtitle")}
        </p>
      </div>

      {/* Aviso trial por terminar o terminado */}
      {(trialEnded || trialEndingSoon) && (
        <div
          className={`rounded-xl border p-4 ${
            trialEnded
              ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
              : "border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/10"
          }`}
        >
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {trialEnded ? t("plan.trialEnded") : t("plan.trialEndingSoon")}
          </p>
          <button
            type="button"
            onClick={scrollToPlans}
            className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
          >
            {t("plan.viewPlans")}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">{t("plan.currentPlan")}</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{PLAN_LABELS[plan] ?? plan}</span>
        </div>
        {isTrialing && trialEndsAt && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400">{t("plan.trialUntil")}</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {trialEndsAt.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-600 p-6">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t("plan.exportTitle")}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {t("plan.exportDescription")}
        </p>
        <button
          type="button"
          onClick={handleExportData}
          disabled={exporting}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {exporting ? t("plan.exporting") : t("plan.exportButton")}
        </button>
      </div>

      {/* Planes disponibles */}
      <div ref={plansRef} className="scroll-mt-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t("plan.choosePlan")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS_CONFIG.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border p-5 flex flex-col ${
                plan === p.id
                  ? "border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                  : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
              }`}
            >
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t(p.nameKey)}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex-1">{t(p.descriptionKey)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t(p.limitsKey)}</p>
              {"priceKey" in p && p.priceKey && (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2">{t(p.priceKey)}</p>
              )}
              {p.ctaKey && plan !== p.id && (
                <button
                  type="button"
                  onClick={() => openPaymentModal(p.id)}
                  className="btn-primary mt-4 w-full py-2 text-sm font-medium dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  {t(p.ctaKey)}
                </button>
              )}
              {plan === p.id && (
                <p className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{t("plan.yourPlan")}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal método de pago (mock) */}
      {paymentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg p-6">
            <h3 id="payment-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {t("plan.paymentMethod")} {paymentPlanId ? `— ${PLAN_LABELS[paymentPlanId] ?? paymentPlanId}` : ""}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t("plan.paymentComing")}
            </p>
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3 opacity-75">
              <input
                type="text"
                placeholder={t("plan.cardNumber")}
                disabled
                className="input-minimal w-full py-2 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="MM/AA"
                  disabled
                  className="input-minimal flex-1 py-2 dark:bg-slate-700 dark:border-slate-600"
                />
                <input
                  type="text"
                  placeholder="CVV"
                  disabled
                  className="input-minimal w-20 py-2 dark:bg-slate-700 dark:border-slate-600"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{t("plan.secureBuilding")}</p>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={closePaymentModal}
                className="btn-secondary dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200 dark:hover:bg-slate-500"
              >
                {t("plan.close")}
              </button>
              <button
                type="button"
                onClick={handleChoosePlan}
                className="btn-primary dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {t("plan.comingSoon")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
