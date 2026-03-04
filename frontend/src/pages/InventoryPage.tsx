import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "../lib/pdf";
import { API_BASE_URL, authFetch, authHeaders } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { Tooltip } from "../components/Tooltip";
import { IconPlus } from "../components/Icons";
import { Pagination } from "../components/Pagination";
import { TableSortHeader, sortByColumn } from "../components/TableSortHeader";

type Product = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  variants: Array<{
    id: number;
    size: string;
    color: string;
    sku: string;
    barcode: string | null;
    price: string;
    costPrice: string | null;
  }>;
};

type InventoryRow = {
  id: number;
  quantity: number;
  branch: { id: number; name: string; code: string };
  variant: {
    id: number;
    size: string;
    color: string;
    sku: string;
    product: { id: number; name: string; category: string | null; brand: string | null };
  };
};

type Branch = { id: number; name: string; code: string };

type InventoryPaginated = {
  data: InventoryRow[];
  total: number;
  page: number;
  pageSize: number;
};

type ProductsPaginated = {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
};

type VariantForm = {
  size: string;
  color: string;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
};

const DEFAULT_PAGE_SIZE = 15;

type InventoryTabId = "productos" | "stock";

function escapeCsvCell(s: string | null | undefined): string {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTabId>("productos");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [exportProductsLoading, setExportProductsLoading] = useState(false);
  const [exportStockLoading, setExportStockLoading] = useState(false);
  const [exportProductsPdfLoading, setExportProductsPdfLoading] = useState(false);
  const [exportStockPdfLoading, setExportStockPdfLoading] = useState(false);
  const [exportProductsExcelLoading, setExportProductsExcelLoading] = useState(false);
  const [exportStockExcelLoading, setExportStockExcelLoading] = useState(false);

  const [prodSortKey, setProdSortKey] = useState<string | null>(null);
  const [prodSortDir, setProdSortDir] = useState<"asc" | "desc">("asc");
  const [invSortKey, setInvSortKey] = useState<string | null>(null);
  const [invSortDir, setInvSortDir] = useState<"asc" | "desc">("asc");

  const [productsResult, setProductsResult] = useState<ProductsPaginated | null>(null);
  const [prodPage, setProdPage] = useState(1);
  const [prodPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [prodSearch, setProdSearch] = useState("");
  const [debouncedProdSearch, setDebouncedProdSearch] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [inventoryResult, setInventoryResult] = useState<InventoryPaginated | null>(null);
  const [invPage, setInvPage] = useState(1);
  const [invPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [invBranchId, setInvBranchId] = useState<string>("");
  const [invSearch, setInvSearch] = useState("");
  const [debouncedInvSearch, setDebouncedInvSearch] = useState("");
  const [invCategory, setInvCategory] = useState("");
  const [invHideZero, setInvHideZero] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<{
    branchId: number;
    productVariantId: number;
    quantity: number;
    label: string;
  } | null>(null);
  const [editStockSaving, setEditStockSaving] = useState(false);
  const [editStockError, setEditStockError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOther, setCategoryOther] = useState("");
  const [brand, setBrand] = useState("");
  const [variants, setVariants] = useState<VariantForm[]>([
    { size: "", color: "", sku: "", barcode: "", price: "", costPrice: "" },
  ]);

  const { showToast } = useToast();

  const saveStockQuantity = async () => {
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
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al actualizar");
      }
      setEditStock(null);
      refreshAfterMutation();
      showToast("Cantidad actualizada correctamente.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setEditStockError(msg);
      showToast(msg, "error");
    } finally {
      setEditStockSaving(false);
    }
  };

  const loadBranches = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setBranches(data);
    } catch {
      // ignore
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/products/categories`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, []);

  const loadProducts = useCallback(async (page: number, searchOverride?: string) => {
    setProductsLoading(true);
    setProductsError(null);
    const search = searchOverride !== undefined ? searchOverride : debouncedProdSearch;
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(prodPageSize));
      if (search.trim()) params.set("search", search.trim());
      if (prodCategory.trim()) params.set("category", prodCategory.trim());
      const res = await authFetch(`${API_BASE_URL}/products?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar productos");
      const data = await res.json();
      setProductsResult(data);
    } catch (e) {
      setProductsError(e instanceof Error ? e.message : "Error");
    } finally {
      setProductsLoading(false);
    }
  }, [prodPageSize, debouncedProdSearch, prodCategory]);

  const loadInventory = useCallback(async (page: number, searchOverride?: string) => {
    setInventoryLoading(true);
    setInventoryError(null);
    const search = searchOverride !== undefined ? searchOverride : debouncedInvSearch;
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(invPageSize));
      if (invBranchId) params.set("branchId", invBranchId);
      if (search.trim()) params.set("search", search.trim());
      if (invCategory.trim()) params.set("category", invCategory.trim());
      if (invHideZero) params.set("hideZero", "true");
      const res = await authFetch(`${API_BASE_URL}/inventory?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar inventario");
      const data = await res.json();
      setInventoryResult(data);
    } catch (e) {
      setInventoryError(e instanceof Error ? e.message : "Error");
    } finally {
      setInventoryLoading(false);
    }
  }, [invPageSize, invBranchId, debouncedInvSearch, invCategory, invHideZero]);

  useEffect(() => {
    loadBranches();
    loadCategories();
  }, [loadBranches, loadCategories]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedProdSearch(prodSearch), 400);
    return () => clearTimeout(t);
  }, [prodSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInvSearch(invSearch), 400);
    return () => clearTimeout(t);
  }, [invSearch]);

  useEffect(() => {
    loadProducts(prodPage);
  }, [prodPage, loadProducts]);

  useEffect(() => {
    loadInventory(invPage);
  }, [invPage, loadInventory]);

  const refreshAfterMutation = useCallback(
    (opts?: { productPage?: number; inventoryPage?: number }) => {
      loadProducts(opts?.productPage ?? prodPage);
      loadInventory(opts?.inventoryPage ?? invPage);
    },
    [prodPage, invPage, loadProducts, loadInventory]
  );

  const addVariant = () => {
    setVariants((v) => [
      ...v,
      { size: "", color: "", sku: "", barcode: "", price: "", costPrice: "" },
    ]);
  };

  const updateVariant = (i: number, field: keyof VariantForm, value: string) => {
    setVariants((v) =>
      v.map((row, j) => (j === i ? { ...row, [field]: value } : row))
    );
  };

  const removeVariant = (i: number) => {
    if (variants.length <= 1) return;
    setVariants((v) => v.filter((_, j) => j !== i));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    const vars = variants
      .filter((v) => v.size.trim() && v.color.trim() && v.sku.trim() && v.price.trim())
      .map((v) => ({
        size: v.size.trim(),
        color: v.color.trim(),
        sku: v.sku.trim(),
        barcode: v.barcode.trim() || undefined,
        price: parseFloat(v.price) || 0,
        costPrice: v.costPrice.trim() ? parseFloat(v.costPrice) : undefined,
      }));
    if (vars.length === 0) {
      setCreateError("Agregá al menos una variante con size, color, SKU y precio.");
      setCreating(false);
      return;
    }
    try {
      const res = await authFetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category:
            category === "__new__"
              ? categoryOther.trim() || undefined
              : category.trim() || undefined,
          brand: brand.trim() || undefined,
          variants: vars,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al crear producto");
      setShowCreate(false);
      setName("");
      setDescription("");
      setCategory("");
      setCategoryOther("");
      setBrand("");
      setVariants([
        { size: "", color: "", sku: "", barcode: "", price: "", costPrice: "" },
      ]);
      loadCategories();
      refreshAfterMutation({ productPage: 1 });
      setProdPage(1);
      showToast("Producto creado correctamente.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setCreateError(msg);
      showToast(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  const openCreate = () => {
    setCreateError(null);
    setShowCreate(true);
  };

  const exportProductsCsv = async () => {
    setExportProductsLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/products`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar productos");
      const products: Product[] = await res.json();
      const headers = [
        "Producto",
        "Categoría",
        "Marca",
        "Talle",
        "Color",
        "SKU",
        "Cód. barras",
        "Precio",
        "Costo",
      ];
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
      setExportProductsLoading(false);
    }
  };

  const exportStockCsv = async () => {
    setExportStockLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/inventory`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar inventario");
      const inventory: InventoryRow[] = await res.json();
      const headers = [
        "Sucursal",
        "Código",
        "Producto",
        "Categoría",
        "Talle",
        "Color",
        "SKU",
        "Cantidad",
      ];
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
      setExportStockLoading(false);
    }
  };

  const exportProductsExcel = async () => {
    setExportProductsExcelLoading(true);
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
      setExportProductsExcelLoading(false);
    }
  };

  const exportStockExcel = async () => {
    setExportStockExcelLoading(true);
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
      setExportStockExcelLoading(false);
    }
  };

  const exportProductsPdf = async () => {
    setExportProductsPdfLoading(true);
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
      setExportProductsPdfLoading(false);
    }
  };

  const exportStockPdf = async () => {
    setExportStockPdfLoading(true);
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
      setExportStockPdfLoading(false);
    }
  };

  const handleProdSort = (key: string) => {
    setProdSortKey(key);
    setProdSortDir((d) => (prodSortKey === key && d === "asc" ? "desc" : "asc"));
  };
  const handleInvSort = (key: string) => {
    setInvSortKey(key);
    setInvSortDir((d) => (invSortKey === key && d === "asc" ? "desc" : "asc"));
  };

  const sortedProducts = productsResult?.data
    ? sortByColumn(
        productsResult.data,
        prodSortKey,
        prodSortDir,
        (p, k) => {
          if (k === "name") return p.name;
          if (k === "category") return p.category ?? "";
          if (k === "brand") return p.brand ?? "";
          if (k === "variants") return p.variants.length;
          return "";
        }
      )
    : [];

  const sortedInventory = inventoryResult?.data
    ? sortByColumn(
        inventoryResult.data,
        invSortKey,
        invSortDir,
        (row, k) => {
          if (k === "branch") return row.branch.name;
          if (k === "product") return `${row.variant.product.name} ${row.variant.size} ${row.variant.color}`;
          if (k === "sku") return row.variant.sku;
          if (k === "quantity") return row.quantity;
          return "";
        }
      )
    : [];

  const loadingAny = (productsLoading && !productsResult) || (inventoryLoading && !inventoryResult);
  if (loadingAny) {
    return <p className="text-sm text-slate-500">Cargando inventario...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-500 text-sm">Productos y stock por sucursal.</p>
        <Tooltip content="Crear producto con nombre, categoría y variantes (talle, color, SKU, precio)">
          <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <IconPlus />
            Nuevo producto
          </button>
        </Tooltip>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-1" aria-label="Pestañas inventario">
          <button
            type="button"
            onClick={() => setActiveTab("productos")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              activeTab === "productos"
                ? "border-indigo-500 text-indigo-600 bg-white border-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            Productos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              activeTab === "stock"
                ? "border-indigo-500 text-indigo-600 bg-white border-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            Stock por sucursal
          </button>
        </nav>
      </div>

      {activeTab === "productos" && (
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Productos</h3>
          <div className="flex flex-wrap gap-2">
            <Tooltip content="Descargar todos los productos en CSV">
              <button
                type="button"
                onClick={exportProductsCsv}
                disabled={exportProductsLoading || exportProductsPdfLoading || exportProductsExcelLoading}
                className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                {exportProductsLoading ? "Exportando…" : "Exportar CSV"}
              </button>
            </Tooltip>
            <Tooltip content="Descargar todos los productos en Excel (.xlsx)">
              <button
                type="button"
                onClick={exportProductsExcel}
                disabled={exportProductsLoading || exportProductsPdfLoading || exportProductsExcelLoading}
                className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                {exportProductsExcelLoading ? "Exportando…" : "Exportar Excel"}
              </button>
            </Tooltip>
            <Tooltip content="Descargar todos los productos en PDF">
              <button
                type="button"
                onClick={exportProductsPdf}
                disabled={exportProductsLoading || exportProductsPdfLoading || exportProductsExcelLoading}
                className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                {exportProductsPdfLoading ? "Exportando…" : "Exportar PDF"}
              </button>
            </Tooltip>
          </div>
        </div>
        {productsError && (
          <p className="text-sm text-red-600 mb-2">
            {productsError}
            <button type="button" onClick={() => loadProducts(prodPage)} className="ml-2 underline">
              Reintentar
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-3 mb-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre o SKU</label>
            <input
              type="text"
              placeholder="Buscar…"
              value={prodSearch}
              onChange={(e) => {
                setProdSearch(e.target.value);
                setProdPage(1);
              }}
              onKeyDown={(e) => e.key === "Enter" && loadProducts(1, prodSearch)}
              className="input-minimal max-w-xs dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Categoría</label>
            <select
              value={prodCategory}
              onChange={(e) => {
                setProdCategory(e.target.value);
                setProdPage(1);
              }}
              className="input-minimal max-w-[200px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              aria-label="Categoría"
            >
              <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setDebouncedProdSearch(prodSearch);
              setProdPage(1);
              loadProducts(1, prodSearch);
            }}
            className="btn-secondary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            Filtrar
          </button>
        </div>
        <div className="table-modern">
          <table className="min-w-[400px]">
            <thead>
              <tr>
                <TableSortHeader label="Nombre" sortKey="name" currentSortKey={prodSortKey} currentSortDir={prodSortDir} onSort={handleProdSort} />
                <TableSortHeader label="Categoría" sortKey="category" currentSortKey={prodSortKey} currentSortDir={prodSortDir} onSort={handleProdSort} />
                <TableSortHeader label="Marca" sortKey="brand" currentSortKey={prodSortKey} currentSortDir={prodSortDir} onSort={handleProdSort} />
                <TableSortHeader label="Variantes" sortKey="variants" currentSortKey={prodSortKey} currentSortDir={prodSortDir} onSort={handleProdSort} />
              </tr>
            </thead>
            <tbody>
              {productsLoading && !productsResult ? (
                <tr>
                  <td colSpan={4} className="text-center text-slate-500 dark:text-slate-400 py-8">Cargando…</td>
                </tr>
              ) : !productsResult || productsResult.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No hay productos. Creá uno con &quot;Nuevo producto&quot;.
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category ?? "—"}</td>
                    <td>{p.brand ?? "—"}</td>
                    <td>
                      {p.variants.length} ({p.variants.map((v) => v.sku).join(", ")})
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {productsResult && productsResult.total > 0 && (
          <Pagination
            page={productsResult.page}
            pageSize={productsResult.pageSize}
            total={productsResult.total}
            onPageChange={setProdPage}
            className="mt-3"
          />
        )}
      </section>
      )}

      {activeTab === "stock" && (
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stock por sucursal</h3>
          <div className="flex flex-wrap gap-2">
            <Tooltip content="Descargar todo el stock en CSV">
              <button
                type="button"
                onClick={exportStockCsv}
                disabled={exportStockLoading || exportStockPdfLoading || exportStockExcelLoading}
                className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                {exportStockLoading ? "Exportando…" : "Exportar CSV"}
              </button>
            </Tooltip>
            <Tooltip content="Descargar todo el stock en Excel (.xlsx)">
              <button
                type="button"
                onClick={exportStockExcel}
                disabled={exportStockLoading || exportStockPdfLoading || exportStockExcelLoading}
                className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                {exportStockExcelLoading ? "Exportando…" : "Exportar Excel"}
              </button>
            </Tooltip>
            <Tooltip content="Descargar todo el stock en PDF">
              <button
                type="button"
                onClick={exportStockPdf}
                disabled={exportStockLoading || exportStockPdfLoading || exportStockExcelLoading}
                className="btn-secondary inline-flex items-center gap-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                {exportStockPdfLoading ? "Exportando…" : "Exportar PDF"}
              </button>
            </Tooltip>
          </div>
        </div>
        {inventoryError && (
          <p className="text-sm text-red-600 mb-2">
            {inventoryError}
            <button type="button" onClick={() => loadInventory(invPage)} className="ml-2 underline">
              Reintentar
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-3 mb-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sucursal</label>
            <select
              value={invBranchId}
              onChange={(e) => {
                setInvBranchId(e.target.value);
                setInvPage(1);
              }}
              className="input-minimal max-w-[200px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre o SKU</label>
            <input
              type="text"
              placeholder="Buscar…"
              value={invSearch}
              onChange={(e) => {
                setInvSearch(e.target.value);
                setInvPage(1);
              }}
              onKeyDown={(e) => e.key === "Enter" && loadInventory(1, invSearch)}
              className="input-minimal max-w-xs dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Categoría</label>
            <select
              value={invCategory}
            onChange={(e) => {
              setInvCategory(e.target.value);
              setInvPage(1);
            }}
            className="input-minimal max-w-[200px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            aria-label="Categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          </div>
          <Tooltip content="Solo ítems con cantidad mayor a cero">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={invHideZero}
                onChange={(e) => {
                  setInvHideZero(e.target.checked);
                  setInvPage(1);
                }}
                className="rounded border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700"
              />
              Ocultar sin stock
            </label>
          </Tooltip>
          <button
            type="button"
            onClick={() => {
              setDebouncedInvSearch(invSearch);
              setInvPage(1);
              loadInventory(1);
            }}
            className="btn-secondary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            Filtrar
          </button>
        </div>
        <div className="table-modern">
          <table className="min-w-[400px]">
            <thead>
              <tr>
                <TableSortHeader label="Sucursal" sortKey="branch" currentSortKey={invSortKey} currentSortDir={invSortDir} onSort={handleInvSort} />
                <TableSortHeader label="Producto / Variante" sortKey="product" currentSortKey={invSortKey} currentSortDir={invSortDir} onSort={handleInvSort} />
                <TableSortHeader label="SKU" sortKey="sku" currentSortKey={invSortKey} currentSortDir={invSortDir} onSort={handleInvSort} />
                <TableSortHeader label="Cantidad" sortKey="quantity" currentSortKey={invSortKey} currentSortDir={invSortDir} onSort={handleInvSort} />
                <th className="w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventoryLoading && !inventoryResult ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">Cargando…</td>
                </tr>
              ) : !inventoryResult || inventoryResult.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No hay ítems con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                sortedInventory.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.branch.name} ({row.branch.code})
                    </td>
                    <td>
                      {row.variant.product.name} — {row.variant.size} / {row.variant.color}
                    </td>
                    <td>{row.variant.sku}</td>
                    <td className="font-medium">{row.quantity}</td>
                    <td>
                      <Tooltip content="Editar cantidad en stock">
                        <button
                          type="button"
                          onClick={() =>
                            setEditStock({
                              branchId: row.branch.id,
                              productVariantId: row.variant.id,
                              quantity: row.quantity,
                              label: `${row.variant.product.name} · ${row.variant.sku} (${row.branch.code})`,
                            })
                          }
                          className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                        >
                          Editar
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {inventoryResult && inventoryResult.total > 0 && (
          <Pagination
            page={inventoryResult.page}
            pageSize={inventoryResult.pageSize}
            total={inventoryResult.total}
            onPageChange={setInvPage}
            className="mt-3"
          />
        )}
      </section>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-product-title"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 id="new-product-title" className="text-lg font-semibold tracking-tight text-slate-900">
                Nuevo producto
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Datos del producto */}
                <section className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">
                    Datos del producto
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="product-name" className="block text-sm font-medium text-slate-500 mb-1.5">
                        Nombre del producto <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="product-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-minimal"
                        placeholder="Ej. Remera básica algodón"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="product-desc" className="block text-sm font-medium text-slate-500 mb-1.5">
                        Descripción
                      </label>
                      <input
                        id="product-desc"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input-minimal"
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label htmlFor="product-category" className="block text-sm font-medium text-slate-500 mb-1.5">
                        Categoría
                      </label>
                      <select
                        id="product-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="input-minimal"
                      >
                        <option value="">Sin categoría</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__new__">— Otra (escribir abajo) —</option>
                      </select>
                      {category === "__new__" && (
                        <input
                          type="text"
                          value={categoryOther}
                          onChange={(e) => setCategoryOther(e.target.value)}
                          className="input-minimal mt-2"
                          placeholder="Nueva categoría"
                        />
                      )}
                    </div>
                    <div>
                      <label htmlFor="product-brand" className="block text-sm font-medium text-slate-500 mb-1.5">
                        Marca
                      </label>
                      <input
                        id="product-brand"
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="input-minimal"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </section>

                {/* Variantes */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-medium text-slate-700">Variantes</h3>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Agregar variante
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Cada variante es una combinación de talle/color. Podés escanear el código de barras en el campo correspondiente.
                  </p>
                  <div className="space-y-4">
                    {variants.map((v, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Variante {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            disabled={variants.length <= 1}
                            className="rounded-md p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-950/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            aria-label={`Quitar variante ${i + 1}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Talle</label>
                            <input
                              placeholder="Ej. M"
                              value={v.size}
                              onChange={(e) => updateVariant(i, "size", e.target.value)}
                              className="input-minimal"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
                            <input
                              placeholder="Ej. Negro"
                              value={v.color}
                              onChange={(e) => updateVariant(i, "color", e.target.value)}
                              className="input-minimal"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">SKU</label>
                            <input
                              placeholder="Ej. REM-M-NEG"
                              value={v.sku}
                              onChange={(e) => updateVariant(i, "sku", e.target.value)}
                              className="input-minimal"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Cód. barras</label>
                            <input
                              placeholder="Escanear o escribir"
                              value={v.barcode}
                              onChange={(e) => updateVariant(i, "barcode", e.target.value)}
                              className="input-minimal"
                              autoFocus={i === 0}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Precio venta</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={v.price}
                              onChange={(e) => updateVariant(i, "price", e.target.value)}
                              className="input-minimal"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Costo (opc.)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={v.costPrice}
                              onChange={(e) => updateVariant(i, "costPrice", e.target.value)}
                              className="input-minimal"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {createError && (
                  <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    {createError}
                  </div>
                )}
              </div>

              {/* Footer fijo */}
              <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
                >
                  {creating ? "Creando…" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editStock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-stock-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl p-5">
            <h2 id="edit-stock-title" className="text-lg font-semibold text-slate-900 mb-1">
              Editar cantidad
            </h2>
            <p className="text-sm text-slate-500 mb-4 truncate">{editStock.label}</p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-600">Cantidad</label>
              <input
                type="number"
                min={0}
                value={editStock.quantity}
                onChange={(e) =>
                  setEditStock((prev) =>
                    prev ? { ...prev, quantity: Math.max(0, parseInt(e.target.value, 10) || 0) } : null
                  )
                }
                className="input-minimal"
              />
            </div>
            {editStockError && (
              <p className="mt-3 text-sm text-red-600">{editStockError}</p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setEditStock(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveStockQuantity}
                disabled={editStockSaving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {editStockSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
