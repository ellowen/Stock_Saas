import { useState, useMemo } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowKey: (row: T, index: number) => string | number;
  emptyMessage?: string;
  onExportCsv?: () => void;
  pageSize?: number;
  className?: string;
}

function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" style={{ width: `${60 + ((i * j) % 3) * 15}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className="ml-1 inline-flex flex-col opacity-50" aria-hidden>
      <svg className={`w-2.5 h-2.5 ${active && dir === "asc" ? "opacity-100 text-primary-600" : ""}`} viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg className={`w-2.5 h-2.5 ${active && dir === "desc" ? "opacity-100 text-primary-600" : ""}`} viewBox="0 0 10 6" fill="currentColor">
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  );
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  rowKey,
  emptyMessage = "Sin datos.",
  onExportCsv,
  pageSize = 0,
  className = "",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const col = columns.find((c) => c.key === sortKey);
      if (!col) return 0;
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  const paginated = useMemo(() => {
    if (!pageSize) return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden ${className}`}>
      {onExportCsv && (
        <div className="flex justify-end px-4 py-2 border-b border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onExportCsv}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide select-none ${col.sortable ? "cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" : ""} ${col.className ?? ""}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable && (
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <SkeletonRows cols={columns.length} />
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-gray-700 dark:text-gray-300 ${col.className ?? ""}`}>
                      {col.render
                        ? col.render(row, i)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Página {page} de {totalPages} · {data.length} registros
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
