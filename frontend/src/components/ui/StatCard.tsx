import React from "react";

type TrendDir = "up" | "down" | "neutral";
type Color = "blue" | "green" | "yellow" | "red" | "purple" | "indigo";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; direction: TrendDir };
  color?: Color;
  loading?: boolean;
}

const colorClasses: Record<Color, { icon: string; bg: string }> = {
  blue:   { icon: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  green:  { icon: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
  yellow: { icon: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  red:    { icon: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-900/20" },
  purple: { icon: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
  indigo: { icon: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
};

const trendClasses: Record<TrendDir, string> = {
  up:      "text-green-600 dark:text-green-400",
  down:    "text-red-600 dark:text-red-400",
  neutral: "text-gray-500 dark:text-gray-400",
};

export function StatCard({ title, value, icon, trend, color = "blue", loading = false }: StatCardProps) {
  const c = colorClasses[color];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-card shadow-card p-5 animate-pulse">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-card shadow-card p-5 flex items-start gap-4">
      {icon && (
        <div className={`p-2.5 rounded-xl shrink-0 ${c.bg}`}>
          <span className={`block w-5 h-5 ${c.icon}`}>{icon}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
          {title}
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
        {trend && (
          <p className={`mt-1 text-xs font-medium ${trendClasses[trend.direction]}`}>
            {trend.direction === "up" && "↑ "}
            {trend.direction === "down" && "↓ "}
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
