import { useCallback, useState } from "react";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import type { CartEntry } from "../types";

export type HeldSale = {
  id: number;
  branchId: number;
  customerId: number | null;
  note: string | null;
  cart: CartEntry[];
  discountTotal: string | number;
  createdAt: string;
  customer?: { id: number; name: string; taxId: string | null; phone: string | null } | null;
  user?: { id: number; fullName: string; username: string };
};

export type HoldSaleInput = {
  branchId: number;
  customerId?: number | null;
  note?: string;
  cart: CartEntry[];
  discountTotal?: number;
};

export function useHeldSales() {
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHeldSales = useCallback(async (branchId?: number) => {
    setLoading(true);
    try {
      const qs = branchId ? `?branchId=${branchId}` : "";
      const res = await authFetch(`${API_BASE_URL}/held-sales${qs}`, { headers: authHeaders() });
      if (res.ok) setHeldSales(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const holdSale = useCallback(async (input: HoldSaleInput) => {
    const res = await authFetch(`${API_BASE_URL}/held-sales`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message ?? "Error al poner la venta en espera");
    return data as HeldSale;
  }, []);

  const resumeSale = useCallback(async (id: number) => {
    const res = await authFetch(`${API_BASE_URL}/held-sales/${id}/resume`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message ?? "Error al retomar la venta");
    return data as HeldSale;
  }, []);

  const discardSale = useCallback(async (id: number) => {
    const res = await authFetch(`${API_BASE_URL}/held-sales/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { message?: string }).message ?? "Error al eliminar la venta en espera");
    }
  }, []);

  return { heldSales, loading, loadHeldSales, holdSale, resumeSale, discardSale };
}
