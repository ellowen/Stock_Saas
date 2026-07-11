import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useSales } from "./hooks/useSales";
import { POSTab } from "./tabs/POSTab";
import { SalesHistoryTab } from "./tabs/SalesHistoryTab";
import type { SalesTab } from "./types";

export function SalesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SalesTab>("pos");
  const [branchId, setBranchId] = useState<number | "">("");

  const {
    branches,
    inventory,
    loadBranches,
    loadInventory,
    createSale,
    sendReceiptEmail,
    cancelSale,
    returnSaleItems,
    historySales,
    historyLoading,
    historyError,
    loadHistory,
    branchesLoading,
    branchesError,
    inventoryError,
    submitting,
  } = useSales();

  // Load branches once on mount
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // Preferir la sucursal ya asignada al usuario (viene con el JWT, sin round-trip
  // extra) en vez de esperar a que termine de cargar la lista completa de
  // sucursales. Si el usuario no tiene sucursal fija (ej. OWNER), cae al
  // fallback de "primera sucursal de la lista" una vez que esta carga.
  useEffect(() => {
    if (branchId !== "") return;
    if (user?.auth.branchId != null) {
      setBranchId(user.auth.branchId);
    } else if (branches.length > 0) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId, user]);

  // Carga el inventario apenas se resuelve la sucursal — en paralelo con la
  // carga de sucursales, no despues (evita el "waterfall" secuencial).
  useEffect(() => {
    if (typeof branchId === "number") {
      loadInventory(branchId);
    }
  }, [branchId, loadInventory]);

  // Load history when switching to historial tab
  useEffect(() => {
    if (activeTab === "historial") {
      loadHistory({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on tab switch; filter button re-calls loadHistory
  }, [activeTab]);

  const handleLoadHistory = useCallback(
    (filters: { branchId?: string; from?: string; to?: string }) => {
      loadHistory(filters);
    },
    [loadHistory]
  );

  if (branchesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
          <span className="inline-block w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
          {t("sales.loading")}
        </div>
      </div>
    );
  }

  if (branchesError) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-base text-red-700 dark:text-red-300">
        {branchesError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tab navigation */}
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
          {t("sales.pos")}
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
          {t("sales.history")}
        </button>
      </nav>

      {activeTab === "historial" ? (
        <SalesHistoryTab
          branches={branches}
          historySales={historySales}
          historyLoading={historyLoading}
          historyError={historyError}
          onLoadHistory={handleLoadHistory}
          onCancelSale={cancelSale}
          onReturnItems={returnSaleItems}
        />
      ) : (
        <POSTab
          branches={branches}
          branchId={branchId}
          onBranchChange={setBranchId}
          inventory={inventory}
          submitting={submitting}
          inventoryError={inventoryError}
          onCreateSale={createSale}
          onSendReceiptEmail={sendReceiptEmail}
        />
      )}
    </div>
  );
}
