import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "../../../lib/pdf";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import { useToast } from "../../../contexts/ToastContext";
import type { Product, ProductsPaginated } from "../types";
import { escapeCsvCell, DEFAULT_PAGE_SIZE } from "../types";

export type UseProductsOptions = {
  onMutated?: () => void;
};

export function useProducts({ onMutated }: UseProductsOptions = {}) {
  const [result, setResult] = useState<ProductsPaginated | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [exportCsvLoading, setExportCsvLoading] = useState(false);
  const [exportExcelLoading, setExportExcelLoading] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);

  const { showToast } = useToast();

  const load = useCallback(
    async (p: number, searchOverride?: string) => {
      setLoading(true);
      setError(null);
      const q = searchOverride !== undefined ? searchOverride : debouncedSearch;
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("pageSize", String(DEFAULT_PAGE_SIZE));
        if (q.trim()) params.set("search", q.trim());
        if (category.trim()) params.set("category", category.trim());
        if (brand.trim()) params.set("brand", brand.trim());
        const minP = minPrice.trim() !== "" ? parseFloat(minPrice) : NaN;
        const maxP = maxPrice.trim() !== "" ? parseFloat(maxPrice) : NaN;
        if (!Number.isNaN(minP) && minP >= 0) params.set("minPrice", String(minP));
        if (!Number.isNaN(maxP) && maxP >= 0) params.set("maxPrice", String(maxP));
        const res = await authFetch(`${API_BASE_URL}/products?${params}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Error al cargar productos");
        const data = await res.json();
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, category, brand, minPrice, maxPrice]
  );

  const deleteProduct = useCallback(
    async (product: Product) => {
      const res = await authFetch(`${API_BASE_URL}/products/${product.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message || "Error al eliminar");
      }
      onMutated?.();
      showToast("Producto eliminado.");
    },
    [onMutated, showToast]
  );

  const handleSort = (key: string) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key && d === "asc" ? "desc" : "asc"));
  };

  const exportCsv = useCallback(async () => {
    setExportCsvLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/products`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar productos");
      const products: Product[] = await res.json();
      const headers = ["Producto", "Categoría", "Marca", "Talle", "Color", "SKU", "Cód. barras", "Precio", "Costo"];
      const rows = products.flatMap((p) =>
        p.variants.length > 0
          ? p.variants.map((v) => [
              escapeCsvCell(p.name),
              escapeCsvCell(p.category),
              escapeCsvCell(p.brand),
              escapeCsvCell(v.size),
              escapeCsvCell(v.color),
              escapeCsvCell(v.sku),
              escapeCsvCell(v.barcode),
              escapeCsvCell(v.price),
              escapeCsvCell(v.costPrice),
            ])
          : [[escapeCsvCell(p.name), escapeCsvCell(p.category), escapeCsvCell(p.brand), "", "", "", "", "", ""]]
      );
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `productos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setExportCsvLoading(false);
    }
  }, []);

  const exportExcel = useCallback(async () => {
    setExportExcelLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/products`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar productos");
      const products: Product[] = await res.json();
      const headers = ["Producto", "Categoría", "Marca", "Talle", "Color", "SKU", "Cód. barras", "Precio", "Costo"];
      const rows = products.flatMap((p) =>
        p.variants.length > 0
          ? p.variants.map((v) => [
              p.name,
              p.category ?? "",
              p.brand ?? "",
              v.size,
              v.color,
              v.sku,
              v.barcode ?? "",
              String(v.price),
              v.costPrice != null ? String(v.costPrice) : "",
            ])
          : [[p.name, p.category ?? "", p.brand ?? "", "", "", "", "", "", ""]]
      );
      const data = [headers, ...rows] as string[][];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos");
      XLSX.writeFile(wb, `productos-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast("Productos exportados en Excel.");
    } catch {
      showToast("Error al exportar Excel.", "error");
    } finally {
      setExportExcelLoading(false);
    }
  }, [showToast]);

  const exportPdf = useCallback(async () => {
    setExportPdfLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/products`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar productos");
      const products: Product[] = await res.json();
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.text("Listado de productos", 14, 12);
      doc.setFontSize(10);
      const head = [["Producto", "Categoría", "Marca", "Talle", "Color", "SKU", "Precio", "Costo"]];
      const body = products.flatMap((p) =>
        p.variants.length > 0
          ? p.variants.map((v) => [
              p.name,
              p.category ?? "",
              p.brand ?? "",
              v.size,
              v.color,
              v.sku,
              String(v.price),
              v.costPrice ? String(v.costPrice) : "",
            ])
          : [[p.name, p.category ?? "", p.brand ?? "", "", "", "", "", ""]]
      );
      (doc as jsPDF & { autoTable: (opts: Record<string, unknown>) => jsPDF }).autoTable({
        head,
        body,
        startY: 18,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [100, 116, 139] },
        margin: { left: 14 },
      });
      doc.save(`productos-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      // ignore
    } finally {
      setExportPdfLoading(false);
    }
  }, []);

  return {
    result,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    debouncedSearch,
    setDebouncedSearch,
    category,
    setCategory,
    brand,
    setBrand,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    sortKey,
    sortDir,
    handleSort,
    load,
    deleteProduct,
    exportCsv,
    exportCsvLoading,
    exportExcel,
    exportExcelLoading,
    exportPdf,
    exportPdfLoading,
  };
}
