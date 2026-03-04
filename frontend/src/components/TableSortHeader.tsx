type SortDir = "asc" | "desc";

type TableSortHeaderProps = {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
};

export function TableSortHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  className = "",
}: TableSortHeaderProps) {
  const isActive = currentSortKey === sortKey;
  return (
    <th
      className={`px-4 py-3 font-medium text-left cursor-pointer select-none hover:bg-slate-200/70 dark:hover:bg-slate-600/70 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
      role="columnheader"
      aria-sort={isActive ? (currentSortDir === "asc" ? "ascending" : "descending") : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-slate-400 dark:text-slate-500" aria-hidden>
          {isActive ? (currentSortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </span>
    </th>
  );
}

export function sortByColumn<T>(
  data: T[],
  sortKey: string | null,
  sortDir: SortDir,
  getValue: (row: T, key: string) => string | number
): T[] {
  if (!sortKey) return data;
  return [...data].sort((a, b) => {
    const va = getValue(a, sortKey);
    const vb = getValue(b, sortKey);
    const cmp = typeof va === "string" && typeof vb === "string"
      ? va.localeCompare(vb, undefined, { numeric: true })
      : Number(va) - Number(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });
}
