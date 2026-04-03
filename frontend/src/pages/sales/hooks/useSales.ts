import { useCallback, useState } from "react";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import type { Branch, InventoryRow, SaleListItem, PaymentMethod, CartEntry } from "../types";

export type ReturnItemInput = { variantId: number; quantity: number };

export type CreateSaleParams = {
  branchId: number;
  method: PaymentMethod;
  cart: CartEntry[];
  mixedBreakdown?: { cash: number; card: number };
  customerId?: number | null;
  discountTotal?: number;
};

export type UseSalesReturn = {
  branches: Branch[];
  inventory: InventoryRow[];
  loadBranches: () => Promise<void>;
  loadInventory: (branchId: number) => Promise<void>;
  createSale: (params: CreateSaleParams) => Promise<void>;
  cancelSale: (saleId: number) => Promise<void>;
  returnSaleItems: (saleId: number, items: ReturnItemInput[], reason?: string) => Promise<void>;
  historySales: SaleListItem[];
  historyLoading: boolean;
  historyError: string | null;
  loadHistory: (filters: { branchId?: string; from?: string; to?: string }) => Promise<void>;
  branchesLoading: boolean;
  branchesError: string | null;
  inventoryError: string | null;
  submitting: boolean;
};

export function useSales(): UseSalesReturn {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [historySales, setHistorySales] = useState<SaleListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar sucursales");
      const data: Branch[] = await res.json();
      setBranches(data);
    } catch (e) {
      setBranchesError(e instanceof Error ? e.message : "Error");
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async (branchId: number) => {
    setInventoryError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory?branchId=${branchId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Error al cargar inventario");
      const data: InventoryRow[] = await res.json();
      setInventory(data);
    } catch (e) {
      setInventoryError(e instanceof Error ? e.message : "Error");
    }
  }, []);

  const createSale = useCallback(async (params: CreateSaleParams) => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        branchId: params.branchId,
        paymentMethod: params.method,
        items: params.cart,
      };
      if (params.method === "MIXED" && params.mixedBreakdown) {
        body.paymentCashAmount = params.mixedBreakdown.cash;
        body.paymentCardAmount = params.mixedBreakdown.card;
      }
      if (params.customerId != null) {
        body.customerId = params.customerId;
      }
      if (params.discountTotal != null && params.discountTotal > 0) {
        body.discountTotal = params.discountTotal;
      }
      const res = await authFetch(`${API_BASE_URL}/sales`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { message?: string }).message || "Error al registrar venta");
    } finally {
      setSubmitting(false);
    }
  }, []);

  const loadHistory = useCallback(async (filters: { branchId?: string; from?: string; to?: string }) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const params = new URLSearchParams();
      if (filters.branchId) params.set("branchId", filters.branchId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const res = await authFetch(`${API_BASE_URL}/sales?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar historial");
      const data: SaleListItem[] = await res.json();
      setHistorySales(data);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Error");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const cancelSale = useCallback(async (saleId: number) => {
    const res = await authFetch(`${API_BASE_URL}/sales/${saleId}/cancel`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message || "Error al anular venta");
  }, []);

  const returnSaleItems = useCallback(async (saleId: number, items: ReturnItemInput[], reason?: string) => {
    const res = await authFetch(`${API_BASE_URL}/sales/${saleId}/return`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ items, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message || "Error al devolver ítems");
  }, []);

  return {
    branches,
    inventory,
    loadBranches,
    loadInventory,
    createSale,
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
  };
}
