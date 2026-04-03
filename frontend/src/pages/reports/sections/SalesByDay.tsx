import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from "recharts";
import html2canvas from "html2canvas";

interface DayData {
  date: string;
  count: number;
  totalAmount: number;
}

interface Props {
  data: DayData[];
}

async function exportChartAsPng(element: HTMLElement | null, filename: string) {
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
}

export function SalesByDay({ data }: Props) {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = data.map((d) => ({
    fecha: new Date(d.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
    ingresos: Number(d.totalAmount),
    ventas: d.count,
  }));

  if (chartData.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("reports.ingresosByDay")}</h5>
        <button
          type="button"
          onClick={() => exportChartAsPng(chartRef.current, "ingresos-por-dia.png")}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {t("reports.downloadPng")}
        </button>
      </div>
      <div ref={chartRef} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
            <RechartsTooltip formatter={(value: number) => [`$${Number(value).toFixed(2)}`, t("reports.revenue")]} />
            <Area type="monotone" dataKey="ingresos" stroke="#6366f1" strokeWidth={2} fill="url(#colorIngresos)" name={t("reports.revenue")} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
