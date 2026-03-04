import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authFetch, getAccessToken } from "../lib/api";
import { Tooltip } from "../components/Tooltip";
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

type DashboardData = {
  salesToday: number;
  revenueToday: number;
  totalStockUnits: number;
  branchesCount: number;
  lowStockAlerts: number;
  salesByDayLast7: { date: string; totalAmount: number; count: number }[];
};

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded animate-pulse mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 h-[280px] bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">No se pudo cargar el panel. {error}</p>
        <button type="button" onClick={() => load()} className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-slate-500 text-sm">Sin datos aún. Empezá a cargar productos y ventas.</p>
    );
  }

  const chartData = data.salesByDayLast7.map((d) => ({
    ...d,
    label: formatDay(d.date),
    ventas: d.count,
    ingresos: Number(d.totalAmount),
  }));

  const cards = [
    {
      label: "Ventas hoy",
      value: data.salesToday,
      sub: `$${Number(data.revenueToday).toFixed(2)}`,
      tooltip: "Operaciones e ingresos del día de hoy",
      accent: "emerald",
    },
    {
      label: "Stock total",
      value: data.totalStockUnits,
      sub: "unidades",
      tooltip: "Suma de unidades en inventario en todas las sucursales",
      accent: "slate",
    },
    {
      label: "Locales activos",
      value: data.branchesCount,
      sub: "sucursales",
      tooltip: "Sucursales activas de tu empresa",
      accent: "slate",
    },
    {
      label: "Alertas de reposición",
      value: data.lowStockAlerts,
      sub: "ítems bajo mínimo",
      tooltip: "Productos con stock por debajo del mínimo o menor a 5 unidades",
      accent: data.lowStockAlerts > 0 ? "red" : "slate",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Panel de control
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Resumen ejecutivo de tu negocio
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-secondary text-sm inline-flex items-center gap-2 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
        >
          {refreshing ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              Actualizando…
            </>
          ) : (
            "Actualizar"
          )}
        </button>
      </div>

      {/* 4 tarjetas de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Tooltip key={card.label} content={card.tooltip}>
            <div
              className={`rounded-xl border bg-white dark:bg-slate-800 p-5 shadow-sm transition-shadow hover:shadow-md ${
                card.accent === "red"
                  ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20"
                  : card.accent === "emerald"
                    ? "border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-800/60 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-600"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  card.accent === "red"
                    ? "text-red-700 dark:text-red-300"
                    : card.accent === "emerald"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {card.value}
              </p>
              {card.sub && (
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {card.sub}
                </p>
              )}
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Gráficos últimos 7 días */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Ingresos (últimos 7 días)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-30" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(dateStr) => formatDay(dateStr)}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "12px",
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.label ? formatDay(payload[0].payload.date) : ""
                  }
                  formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Ingresos"]}
                />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#colorIngresos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Operaciones por día (últimos 7 días)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-30" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(dateStr) => formatDay(dateStr)}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "12px",
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.label ? formatDay(payload[0].payload.date) : ""
                  }
                  formatter={(value: number) => [value, "Ventas"]}
                />
                <Bar dataKey="ventas" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
