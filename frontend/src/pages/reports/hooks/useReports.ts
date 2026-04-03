import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import { useToast } from "../../../contexts/ToastContext";

export type Overview = {
  totalSales: number;
  totalRevenue: number;
  totalItemsSold: number;
  productsCount: number;
  variantsCount: number;
  totalStockUnits: number;
};

export type ReportDetail = {
  summary: { totalSales: number; totalRevenue: number; totalItemsSold: number };
  byPaymentMethod: { paymentMethod: string; count: number; totalAmount: number }[];
  topProducts: {
    productVariantId: number;
    quantitySold: number;
    revenue: number;
    sku: string;
    variantLabel?: string;
    product: { id: number; name: string; category: string | null; brand: string | null } | null;
  }[];
  salesByDay: { date: string; count: number; totalAmount: number }[];
  salesByCategory?: { category: string; revenue: number; quantitySold: number }[];
};

export type NoMovementRow = {
  productVariantId: number;
  productName: string;
  variantLabel: string;
  sku: string;
  branchId: number;
  branchName: string;
  quantity: number;
  lastMovementAt: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getPrevRange(from: string, to: string): { fromPrev: string; toPrev: string } {
  const fromDate = new Date(from + "T12:00:00");
  const toDate = new Date(to + "T12:00:00");
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  const toPrev = new Date(fromDate);
  toPrev.setDate(toPrev.getDate() - 1);
  const fromPrev = new Date(toPrev);
  fromPrev.setDate(fromPrev.getDate() - days + 1);
  return {
    fromPrev: fromPrev.toISOString().slice(0, 10),
    toPrev: toPrev.toISOString().slice(0, 10),
  };
}

export function useReports() {
  const { showToast } = useToast();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayISO);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [previousPeriod, setPreviousPeriod] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [noMovementDays, setNoMovementDays] = useState(30);
  const [noMovementBranchId, setNoMovementBranchId] = useState<number | "">("");
  const [noMovementLoading, setNoMovementLoading] = useState(false);
  const [noMovementData, setNoMovementData] = useState<NoMovementRow[] | null>(null);

  const [branches, setBranches] = useState<{ id: number; name: string; code: string }[]>([]);

  const loadOverview = useCallback(() => {
    const today = todayISO();
    setOverviewLoading(true);
    authFetch(`${API_BASE_URL}/analytics/overview?from=${today}&to=${today}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOverview(data))
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false));
  }, []);

  const loadDetail = useCallback(() => {
    if (!from || !to || from > to) {
      setDetailError("Elegí un rango de fechas válido (desde ≤ hasta).");
      return;
    }
    setDetailError(null);
    setDetailLoading(true);
    setPreviousPeriod(null);
    const { fromPrev, toPrev } = getPrevRange(from, to);
    Promise.all([
      authFetch(`${API_BASE_URL}/analytics/report-detail?from=${from}&to=${to}`, { headers: authHeaders() }),
      authFetch(`${API_BASE_URL}/analytics/report-detail?from=${fromPrev}&to=${toPrev}`, { headers: authHeaders() }),
    ])
      .then(([resCur, resPrev]) => {
        if (!resCur.ok) throw new Error("Error al cargar el reporte");
        return Promise.all([resCur.json(), resPrev.ok ? resPrev.json() : null]);
      })
      .then(([data, prev]) => {
        setDetail(data);
        setPreviousPeriod(prev ?? null);
      })
      .catch((e) => {
        setDetailError(e instanceof Error ? e.message : "Error");
        setDetail(null);
      })
      .finally(() => setDetailLoading(false));
  }, [from, to]);

  const loadNoMovement = useCallback(() => {
    setNoMovementLoading(true);
    setNoMovementData(null);
    const params = new URLSearchParams({ days: String(noMovementDays) });
    if (noMovementBranchId !== "") params.set("branchId", String(noMovementBranchId));
    authFetch(`${API_BASE_URL}/analytics/products-without-movement?${params}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNoMovementData(Array.isArray(data) ? data : []))
      .catch(() => {
        setNoMovementData([]);
        showToast("Error al cargar el reporte.", "error");
      })
      .finally(() => setNoMovementLoading(false));
  }, [noMovementDays, noMovementBranchId, showToast]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]));
  }, []);

  return {
    overview, overviewLoading, loadOverview,
    from, setFrom, to, setTo,
    detail, previousPeriod, detailLoading, detailError, loadDetail,
    noMovementDays, setNoMovementDays,
    noMovementBranchId, setNoMovementBranchId,
    noMovementLoading, noMovementData, loadNoMovement,
    branches,
  };
}

export function todayISOExport() {
  return new Date().toISOString().slice(0, 10);
}

export function getDateRangePreset(preset: "7" | "30" | "month" | "lastMonth"): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  if (preset === "7") {
    const from = new Date(today); from.setDate(from.getDate() - 6);
    return { from: from.toISOString().slice(0, 10), to };
  }
  if (preset === "30") {
    const from = new Date(today); from.setDate(from.getDate() - 29);
    return { from: from.toISOString().slice(0, 10), to };
  }
  if (preset === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to };
  }
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastTo = new Date(today.getFullYear(), today.getMonth(), 0);
  return { from: from.toISOString().slice(0, 10), to: lastTo.toISOString().slice(0, 10) };
}
