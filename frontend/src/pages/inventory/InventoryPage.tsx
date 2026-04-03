import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, authFetch, authHeaders } from "../../lib/api";
import { Tooltip } from "../../components/Tooltip";
import { ConfirmModal } from "../../components/ConfirmModal";
import { IconPlus } from "../../components/Icons";
import { sortByColumn } from "../../components/TableSortHeader";

import type { Branch, InventoryTabId, Product } from "./types";

import { useProducts } from "./hooks/useProducts";
import { useStock } from "./hooks/useStock";
import { useMovements } from "./hooks/useMovements";

import { ProductsTab } from "./tabs/ProductsTab";
import { StockTab } from "./tabs/StockTab";
import { MovementsTab } from "./tabs/MovementsTab";
import { StockCountTab } from "./tabs/StockCountTab";

import { ProductFormModal } from "./modals/ProductFormModal";
import { StockEditModal } from "./modals/StockEditModal";
import { LabelPrintModal } from "./modals/LabelPrintModal";
import { BulkAdjustModal } from "./modals/BulkAdjustModal";
import { CsvImportModal } from "./modals/CsvImportModal";
import { BatchesModal } from "./modals/BatchesModal";

export function InventoryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTabId>("productos");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Product form modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Label print modal
  const [showLabelPrint, setShowLabelPrint] = useState(false);

  // Bulk adjust modal
  const [showBulkAdjust, setShowBulkAdjust] = useState(false);

  // CSV import modal
  const [showCsvImport, setShowCsvImport] = useState(false);

  // Batches modal
  const [batchesTarget, setBatchesTarget] = useState<{ variantId: number; branchId: number; label: string } | null>(null);

  // ---- Hooks ----
  const loadMeta = useCallback(async () => {
    try {
      const [branchRes, catRes, brandRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/branches`, { headers: authHeaders() }),
        authFetch(`${API_BASE_URL}/products/categories`, { headers: authHeaders() }),
        authFetch(`${API_BASE_URL}/products/brands`, { headers: authHeaders() }),
      ]);
      if (branchRes.ok) setBranches(await branchRes.json());
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(Array.isArray(d) ? d : []);
      }
      if (brandRes.ok) {
        const d = await brandRes.json();
        setBrands(Array.isArray(d) ? d : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const refreshMeta = useCallback(() => {
    void loadMeta();
  }, [loadMeta]);

  const products = useProducts({
    onMutated: () => {
      products.load(products.page);
      stock.load(stock.page);
      refreshMeta();
    },
  });

  const stock = useStock({
    onMutated: () => {
      products.load(products.page);
      stock.load(stock.page);
    },
  });

  const movements = useMovements();

  // Load movements when tab becomes active
  useEffect(() => {
    if (activeTab === "historial") movements.load(movements.page);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Computed sorted inventory (shared between StockTab and LabelPrintModal) ----
  const sortedInventory = stock.result?.data
    ? sortByColumn(stock.result.data, stock.sortKey, stock.sortDir, (row, k) => {
        if (k === "branch") return row.branch.name;
        if (k === "product")
          return `${row.variant.product.name} ${row.variant.size} ${row.variant.color}`;
        if (k === "sku") return row.variant.sku;
        if (k === "quantity") return row.quantity;
        return "";
      })
    : [];

  // ---- Loading gate (first load only) ----
  const loadingAny =
    (products.loading && !products.result) || (stock.loading && !stock.result);
  if (loadingAny) {
    return <p className="text-sm text-slate-500">{t("inventory.loadingInventory")}</p>;
  }

  // ---- Handlers for delete ----
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await products.deleteProduct(productToDelete);
      setProductToDelete(null);
    } catch (e) {
      // error already toasted inside deleteProduct
    } finally {
      setDeleting(false);
    }
  };

  const TAB_CLASS_ACTIVE =
    "border-indigo-500 text-indigo-600 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700";
  const TAB_CLASS_INACTIVE =
    "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800";
  const TAB_BASE =
    "px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors";

  return (
    <div className="space-y-6">
      {/* Page header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-500 text-sm">{t("inventory.pageSubtitle")}</p>
        <div className="flex gap-2">
          <Tooltip content={t("inventory.importCsvTooltip")}>
            <button
              type="button"
              onClick={() => setShowCsvImport(true)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              {t("inventory.importCsvBtn")}
            </button>
          </Tooltip>
          <Tooltip content={t("inventory.bulkAdjustTooltip")}>
            <button
              type="button"
              onClick={() => setShowBulkAdjust(true)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              {t("inventory.bulkAdjustBtn")}
            </button>
          </Tooltip>
          <Tooltip content={t("inventory.newProductTooltip")}>
            <button
              type="button"
              onClick={() => {
                setEditProduct(null);
                setShowCreate(true);
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <IconPlus />
              {t("inventory.newProduct")}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1" aria-label={t("inventory.tabProducts")}>
          {(
            [
              ["productos", t("inventory.tabProducts")],
              ["stock", t("inventory.tabStock")],
              ["historial", t("inventory.tabMovements")],
              ["conteo", t("inventory.tabCount")],
            ] as [InventoryTabId, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`${TAB_BASE} ${activeTab === id ? TAB_CLASS_ACTIVE : TAB_CLASS_INACTIVE}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "productos" && (
        <ProductsTab
          {...products}
          categories={categories}
          brands={brands}
          onOpenCreate={() => {
            setEditProduct(null);
            setShowCreate(true);
          }}
          onOpenEdit={(p) => {
            setEditProduct(p);
            setShowCreate(true);
          }}
          onOpenDelete={(p) => setProductToDelete(p)}
        />
      )}

      {activeTab === "stock" && (
        <StockTab
          {...stock}
          sortedInventory={sortedInventory}
          branches={branches}
          categories={categories}
          brands={brands}
          onShowLabels={() => setShowLabelPrint(true)}
          onShowBatches={(variantId, branchId, label) => setBatchesTarget({ variantId, branchId, label })}
        />
      )}

      {activeTab === "historial" && (
        <MovementsTab {...movements} branches={branches} />
      )}

      {activeTab === "conteo" && (
        <StockCountTab
          branches={branches}
          onStockChanged={() => stock.load(stock.page)}
        />
      )}

      {/* Modals */}
      {showCreate && (
        <ProductFormModal
          editProduct={editProduct}
          categories={categories}
          brands={brands}
          onClose={() => {
            setShowCreate(false);
            setEditProduct(null);
          }}
          onSuccess={({ isNew } = { isNew: false }) => {
            if (isNew) products.setPage(1);
            products.load(isNew ? 1 : products.page);
            stock.load(stock.page);
            refreshMeta();
          }}
        />
      )}

      <ConfirmModal
        open={productToDelete != null}
        title={t("inventory.deleteProductTitle")}
        message={
          productToDelete ? (
            <>
              {t("inventory.deleteProductTitle")}: <strong>{productToDelete.name}</strong>? {t("inventory.deleteProductMessage")}
            </>
          ) : (
            ""
          )
        }
        confirmLabel={t("branches.delete")}
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />

      {showLabelPrint && (
        <LabelPrintModal
          rows={sortedInventory}
          onClose={() => setShowLabelPrint(false)}
        />
      )}

      {showBulkAdjust && (
        <BulkAdjustModal
          branches={branches}
          onClose={() => setShowBulkAdjust(false)}
          onDone={() => {
            stock.load(stock.page);
            products.load(products.page);
          }}
        />
      )}

      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onDone={() => {
            stock.load(stock.page);
            products.load(products.page);
            refreshMeta();
          }}
        />
      )}

      {batchesTarget && (
        <BatchesModal
          variantId={batchesTarget.variantId}
          branchId={batchesTarget.branchId}
          variantLabel={batchesTarget.label}
          onClose={() => setBatchesTarget(null)}
        />
      )}

      {stock.editStock && (
        <StockEditModal
          editStock={stock.editStock}
          editStockSaving={stock.editStockSaving}
          editStockError={stock.editStockError}
          onChangeQuantity={(q) =>
            stock.setEditStock((prev) => (prev ? { ...prev, quantity: q } : null))
          }
          onChangeMinStock={(v) =>
            stock.setEditStock((prev) => (prev ? { ...prev, minStock: v } : null))
          }
          onChangeLocation={(v) =>
            stock.setEditStock((prev) => (prev ? { ...prev, location: v } : null))
          }
          onSave={() => stock.saveStockQuantity()}
          onClose={() => stock.setEditStock(null)}
        />
      )}
    </div>
  );
}
