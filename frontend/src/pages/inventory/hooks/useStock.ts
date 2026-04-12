import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "../../../lib/pdf";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import { useToast } from "../../../contexts/ToastContext";
import type { InventoryPaginated, InventoryRow } from "../types";
import { escapeCsvCell, DEFAULT_PAGE_SIZE } from "../types";

export type EditStockState = {
  branchId: number;
  productVariantId: number;
  quantity: number;
  minStock: number | "";
  location: string;
  label: string;
};

export type UseStockOptions = {
  onMutated?: () => void;
};

export function useStock({ onMutated }: UseStockOptions = {}) {
  const [result, setResult] = useState<InventoryPaginated | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [branchId, setBranchId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [hideZero, setHideZero] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [editStock, setEditStock] = useState<EditStockState | null>(null);
  const [editStockSaving, setEditStockSaving] = useState(false);
  const [editStockError, setEditStockError] = useState<string | null>(null);

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
        if (branchId) params.set("branchId", branchId);
        if (q.trim()) params.set("search", q.trim());
        if (category.trim()) params.set("category", category.trim());
        if (brand.trim()) params.set("brand", brand.trim());
        if (lowStockOnly) params.set("lowStockOnly", "true");
        if (hideZero) params.set("hideZero", "true");
        const minP = minPrice.trim() !== "" ? parseFloat(minPrice) : NaN;
        const maxP = maxPrice.trim() !== "" ? parseFloat(maxPrice) : NaN;
        if (!Number.isNaN(minP) && minP >= 0) params.set("minPrice", String(minP));
        if (!Number.isNaN(maxP) && maxP >= 0) params.set("maxPrice", String(maxP));
        const res = await authFetch(`${API_BASE_URL}/inventory?${params}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Error al cargar inventario");
        const data = await res.json();
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, branchId, category, brand, lowStockOnly, hideZero, minPrice, maxPrice]
  );

  const saveStockQuantity = useCallback(async () => {
    if (!editStock) return;
    setEditStockSaving(true);
    setEditStockError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory/quantity`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          branchId: editStock.branchId,
          productVariantId: editStock.productVariantId,
          quantity: editStock.quantity,
          ...(editStock.minStock !== "" && { minStock: Number(editStock.minStock) }),
          ...(editStock.minStock === "" && { minStock: null }),
          location: editStock.location.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message || "Error al actualizar");
      }
      setEditStock(null);
      onMutated?.();
      showToast("Cantidad actualizada correctamente.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setEditStockError(msg);
      showToast(msg, "error");
    } finally {
      setEditStockSaving(false);
    }
  }, [editStock, onMutated, showToast]);

  const handleSort = (key: string) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key && d === "asc" ? "desc" : "asc"));
  };

  const exportCsv = useCallback(async () => {
    setExportCsvLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar inventario");
      const inventory: InventoryRow[] = await res.json();
      const headers = ["Sucursal", "Código", "Producto", "Categoría", "Talle", "Color", "SKU", "Cantidad"];
      const rows = inventory.map((row) => [
        escapeCsvCell(row.branch.name),
        escapeCsvCell(row.branch.code),
        escapeCsvCell(row.variant.product.name),
        escapeCsvCell(row.variant.product.category),
        escapeCsvCell(row.variant.size),
        escapeCsvCell(row.variant.color),
        escapeCsvCell(row.variant.sku),
        String(row.quantity),
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-por-sucursal-${new Date().toISOString().slice(0, 10)}.csv`;
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
      const res = await authFetch(`${API_BASE_URL}/inventory`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar inventario");
      const inventory: InventoryRow[] = await res.json();
      const headers = ["Sucursal", "Código", "Producto", "Categoría", "Talle", "Color", "SKU", "Cantidad"];
      const rows = inventory.map((row) => [
        row.branch.name,
        row.branch.code,
        row.variant.product.name,
        row.variant.product.category ?? "",
        row.variant.size,
        row.variant.color,
        row.variant.sku,
        row.quantity,
      ]);
      const data = [headers, ...rows] as (string | number)[][];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock");
      XLSX.writeFile(wb, `stock-por-sucursal-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast("Stock exportado en Excel.");
    } catch {
      showToast("Error al exportar Excel.", "error");
    } finally {
      setExportExcelLoading(false);
    }
  }, [showToast]);

  const exportPdf = useCallback(async () => {
    setExportPdfLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar inventario");
      const inventory: InventoryRow[] = await res.json();
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.text("Stock por sucursal", 14, 12);
      doc.setFontSize(10);
      const head = [["Sucursal", "Código", "Producto", "Categoría", "Talle", "Color", "SKU", "Cantidad"]];
      const body = inventory.map((row) => [
        row.branch.name,
        row.branch.code,
        row.variant.product.name,
        row.variant.product.category ?? "",
        row.variant.size,
        row.variant.color,
        row.variant.sku,
        String(row.quantity),
      ]);
      (doc as jsPDF & { autoTable: (opts: Record<string, unknown>) => jsPDF }).autoTable({
        head,
        body,
        startY: 18,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [100, 116, 139] },
        margin: { left: 14 },
      });
      doc.save(`stock-por-sucursal-${new Date().toISOString().slice(0, 10)}.pdf`);
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
    branchId,
    setBranchId,
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
    lowStockOnly,
    setLowStockOnly,
    hideZero,
    setHideZero,
    sortKey,
    sortDir,
    handleSort,
    load,
    editStock,
    setEditStock,
    editStockSaving,
    editStockError,
    setEditStockError,
    saveStockQuantity,
    exportCsv,
    exportCsvLoading,
    exportExcel,
    exportExcelLoading,
    exportPdf,
    exportPdfLoading,
  };
}
