// Shared types for the Inventory feature

export type Product = {
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

export type InventoryRow = {
  id: number;
  quantity: number;
  minStock?: number | null;
  location?: string | null;
  branch: { id: number; name: string; code: string };
  variant: {
    id: number;
    size: string;
    color: string;
    sku: string;
    barcode?: string | null;
    price?: unknown;
    product: { id: number; name: string; category: string | null; brand: string | null };
  };
};

export type Branch = { id: number; name: string; code: string };

export type InventoryPaginated = {
  data: InventoryRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductsPaginated = {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
};

export type VariantForm = {
  size: string;
  color: string;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
};

// Flexible attributes (new backend model)
export type AttributeDefinition = {
  id: number;
  name: string;
  type: string; // e.g. "TEXT", "NUMBER", "SELECT"
  options?: string[] | null;
};

export type AttributeValue = {
  id: number;
  name: string;
  type: string;
  value: string;
};

export type InventoryTabId = "productos" | "stock" | "historial" | "conteo" | "reposicion";

export type MovementRow = {
  id: number;
  type: string;
  quantityBefore: number;
  quantityAfter: number;
  createdAt: string;
  branch: { id: number; name: string; code: string };
  variant: {
    id: number;
    sku: string;
    size: string;
    color: string;
    product: { id: number; name: string };
  };
  user: { id: number; fullName: string; username: string } | null;
};

export type MovementsPaginated = {
  data: MovementRow[];
  total: number;
  page: number;
  pageSize: number;
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  SALE: "Venta",
  MANUAL_ADJUST: "Ajuste",
  SET_QUANTITY: "Edición",
  TRANSFER_IN: "Traspaso (entrada)",
  TRANSFER_OUT: "Traspaso (salida)",
};

export const DEFAULT_PAGE_SIZE = 15;

export function isLowStock(row: { quantity: number; minStock?: number | null }): boolean {
  return (
    (row.minStock != null && row.quantity <= row.minStock) ||
    (row.minStock == null && row.quantity < 5)
  );
}

export function escapeCsvCell(s: string | null | undefined): string {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}
