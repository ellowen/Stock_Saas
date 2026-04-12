import { useState, useMemo } from "react";

type SortDir = "asc" | "desc";

export function useSortable<T>(items: T[], defaultKey?: keyof T, defaultDir: SortDir = "asc") {
  const [key, setKey] = useState<keyof T | null>(defaultKey ?? null);
  const [dir, setDir] = useState<SortDir>(defaultDir);

  const toggle = (newKey: keyof T) => {
    if (key === newKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setKey(newKey);
      setDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!key) return items;
    return [...items].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "es", { numeric: true, sensitivity: "base" });
      return dir === "asc" ? cmp : -cmp;
    });
  }, [items, key, dir]);

  return { sorted, sortKey: key, sortDir: dir, toggle };
}
