import { useCallback, useState } from "react";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import type { MovementsPaginated } from "../types";

export function useMovements() {
  const [result, setResult] = useState<MovementsPaginated | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [branchId, setBranchId] = useState<string>("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("pageSize", "25");
        if (branchId) params.set("branchId", branchId);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await authFetch(
          `${API_BASE_URL}/inventory/movements?${params}`,
          { headers: authHeaders() }
        );
        if (!res.ok) throw new Error("Error al cargar historial");
        const data = await res.json();
        setResult(data);
      } catch {
        setResult({ data: [], total: 0, page: 1, pageSize: 25 });
      } finally {
        setLoading(false);
      }
    },
    [branchId, from, to]
  );

  return {
    result,
    loading,
    page,
    setPage,
    branchId,
    setBranchId,
    from,
    setFrom,
    to,
    setTo,
    load,
  };
}
