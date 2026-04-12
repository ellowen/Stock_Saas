import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL, authFetch, getAccessToken } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { SkeletonCard } from "../components/Skeleton";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

type RecentSale = {
  id: number;
  totalAmount: number;
  totalItems: number;
  paymentMethod: string;
  createdAt: string;
  customerName: string | null;
};

type DashboardData = {
  salesToday: number;
  revenueToday: number;
  salesYesterday: number;
  revenueYesterday: number;
  salesTrend: number | null;
  revenueTrend: number | null;
  totalStockUnits: number;
  branchesCount: number;
  lowStockAlerts: number;
  salesByDayLast7: { date: string; totalAmount: number; count: number }[];
  recentSales: RecentSale[];
  payroll?: {
    pendingConfirmed: number;
    periodCount: number;
    totalNetThisMonth: number;
    paidNetThisMonth: number;
  };
};

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function TrendBadge({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
      up
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
    }`}>
      {up ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      )}
      {Math.abs(pct)}%
    </span>
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transfer.",
  MIXED: "Mixto",
  MERCADOPAGO: "MP",
};

function QuickActions() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const actions = [
    {
      label: "Nueva venta",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      color: "bg-primary-600 hover:bg-primary-700 text-white",
      onClick: () => navigate("/app/sales"),
    },
    {
      label: "Ver inventario",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
      onClick: () => navigate("/app/inventory"),
    },
    hasPermission("PURCHASES_MANAGE") ? {
      label: "Nueva OC",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
      onClick: () => navigate("/app/purchases"),
    } : null,
    hasPermission("REPORTS_VIEW") ? {
      label: "Reportes",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
      onClick: () => navigate("/app/reports"),
    } : null,
  ].filter(Boolean) as { label: string; icon: React.ReactNode; color: string; onClick: () => void }[];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${a.color}`}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}

function RecentSalesWidget({ sales }: { sales: RecentSale[] }) {
  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-sm text-gray-400">Sin ventas registradas aun</p>
        <Link to="/app/sales" className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
          Registrar primera venta
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {sales.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-3 gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {s.customerName ?? "Cliente ocasional"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {formatTime(s.createdAt)} &middot; {s.totalItems} item{s.totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(s.totalAmount)}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const lowStockNotifiedRef = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    const token = getAccessToken();
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar el panel");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (data && data.lowStockAlerts > 0 && !lowStockNotifiedRef.current) {
      lowStockNotifiedRef.current = true;
      showToast(t("dashboard.lowStockToast", { count: data.lowStockAlerts }), "info");
    }
  }, [data, showToast, t]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3].map((i) => <div key={i} className="h-9 w-28 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-xl bg-gray-100 dark:bg-gray-700/30 animate-pulse" />
          <div className="h-72 rounded-xl bg-gray-100 dark:bg-gray-700/30 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 text-center">
        <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-red-700 dark:text-red-300 font-medium">No se pudo cargar el panel</p>
        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{error}</p>
        <button type="button" onClick={() => load()} className="mt-3 px-4 py-1.5 text-sm font-medium rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.salesByDayLast7.map((d) => ({
    ...d,
    label: formatDay(d.date),
    ventas: d.count,
    ingresos: Number(d.totalAmount),
  }));

  const now = new Date();
  const timeGreeting = now.getHours() < 12 ? "Buenos dias" : now.getHours() < 19 ? "Buenas tardes" : "Buenas noches";
  const todayLabel = now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6">

      {/* ── Alerta stock bajo ── */}
      {data.lowStockAlerts > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">{data.lowStockAlerts}</span> producto{data.lowStockAlerts !== 1 ? "s" : ""} con stock bajo
            </p>
          </div>
          <Link to="/app/inventory" className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline shrink-0">
            Ver inventario
          </Link>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{timeGreeting}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-0.5">{todayLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
        >
          <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* ── Acciones rapidas ── */}
      <QuickActions />

      {/* ── 4 KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Ventas hoy */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ventas hoy</p>
            <TrendBadge pct={data.salesTrend} />
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {data.salesToday}
          </p>
          <p className="mt-0.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            {formatCurrency(Number(data.revenueToday))}
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Ayer: {data.salesYesterday} venta{data.salesYesterday !== 1 ? "s" : ""} &middot; {formatCurrency(Number(data.revenueYesterday))}
          </p>
        </div>

        {/* Ingresos hoy */}
        <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-900/10 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ingresos hoy</p>
            <TrendBadge pct={data.revenueTrend} />
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(Number(data.revenueToday))}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {data.salesToday} operacion{data.salesToday !== 1 ? "es" : ""}
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Ayer: {formatCurrency(Number(data.revenueYesterday))}
          </p>
        </div>

        {/* Stock */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Stock total</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {data.totalStockUnits.toLocaleString("es-AR")}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">unidades en inventario</p>
          <Link to="/app/inventory" className="mt-2 inline-block text-xs text-primary-600 dark:text-primary-400 hover:underline">
            Ver inventario
          </Link>
        </div>

        {/* Stock bajo */}
        <div className={`rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
          data.lowStockAlerts > 0
            ? "border-red-200 dark:border-red-800/60 bg-red-50/40 dark:bg-red-900/10"
            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
        }`}>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Stock bajo</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${
            data.lowStockAlerts > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
          }`}>
            {data.lowStockAlerts}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {data.lowStockAlerts > 0 ? "requieren reposicion" : "todo en orden"}
          </p>
          {data.lowStockAlerts > 0 && (
            <Link to="/app/inventory?tab=reposicion" className="mt-2 inline-block text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">
              Ver sugerencias
            </Link>
          )}
        </div>
      </div>

      {/* ── Widget sueldos ── */}
      {data.payroll && data.payroll.periodCount > 0 && hasPermission("EMPLOYEES_VIEW") && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sueldos del mes</h3>
            <Link to="/app/payroll" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              Ver liquidaciones
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Liquidaciones", value: data.payroll.periodCount, color: "" },
              { label: "Total neto", value: formatCurrency(data.payroll.totalNetThisMonth), color: "" },
              { label: "Pagado", value: formatCurrency(data.payroll.paidNetThisMonth), color: "text-emerald-600 dark:text-emerald-400" },
              {
                label: "Pendientes",
                value: data.payroll.pendingConfirmed,
                color: data.payroll.pendingConfirmed > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400",
              },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                <p className={`text-xl font-bold text-gray-900 dark:text-gray-100 ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Graficos + ventas recientes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Graficos - 2/3 ancho */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ingresos 7 dias */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t("dashboard.incomeLast7")}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Evolucion de ingresos diarios</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={55} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#f1f5f9", fontSize: "12px" }}
                    labelFormatter={(_, p) => p?.[0]?.payload ? formatDay(p[0].payload.date) : ""}
                    formatter={(value: number | undefined) => [`$${Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`, "Ingresos"]}
                  />
                  <Area type="monotone" dataKey="ingresos" stroke="#059669" strokeWidth={2} fill="url(#colorIngresos)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ventas 7 dias */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t("dashboard.salesLast7")}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Cantidad de ventas por dia</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#f1f5f9", fontSize: "12px" }}
                    labelFormatter={(_, p) => p?.[0]?.payload ? formatDay(p[0].payload.date) : ""}
                    formatter={(value: number | undefined) => [value ?? 0, "Ventas"]}
                  />
                  <Bar dataKey="ventas" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ventas" maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Ventas recientes - 1/3 ancho */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ventas recientes</h3>
            <Link to="/app/sales" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              Ver todas
            </Link>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Ultimas {data.recentSales.length} operaciones</p>
          <div className="flex-1 min-h-0">
            <RecentSalesWidget sales={data.recentSales} />
          </div>
          {data.recentSales.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Link
                to="/app/sales"
                className="flex items-center justify-center gap-1.5 w-full py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                Ver historial completo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
