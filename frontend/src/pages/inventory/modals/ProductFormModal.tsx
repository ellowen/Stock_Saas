import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import { useToast } from "../../../contexts/ToastContext";
import type { Product, VariantForm } from "../types";
import { VariantManager } from "./VariantManager";

type Props = {
  editProduct: Product | null;
  categories: string[];
  brands: string[];
  onClose: () => void;
  onSuccess: (opts?: { isNew: boolean }) => void;
};

export function ProductFormModal({
  editProduct,
  categories,
  brands: _brands,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState(() => editProduct?.name ?? "");
  const [description, setDescription] = useState(() => editProduct?.description ?? "");
  const [category, setCategory] = useState(() => editProduct?.category ?? "");
  const [categoryOther, setCategoryOther] = useState("");
  const [brand, setBrand] = useState(() => editProduct?.brand ?? "");
  const [variants, setVariants] = useState<VariantForm[]>(() =>
    editProduct && editProduct.variants.length > 0
      ? editProduct.variants.map((v) => ({
          size: v.size,
          color: v.color,
          sku: v.sku,
          barcode: v.barcode ?? "",
          price: typeof v.price === "string" ? v.price : String(v.price),
          costPrice:
            v.costPrice != null
              ? typeof v.costPrice === "string"
                ? v.costPrice
                : String(v.costPrice)
              : "",
        }))
      : [{ size: "", color: "", sku: "", barcode: "", price: "", costPrice: "" }]
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { showToast } = useToast();
  const { t } = useTranslation();

  const addVariant = () =>
    setVariants((v) => [
      ...v,
      { size: "", color: "", sku: "", barcode: "", price: "", costPrice: "" },
    ]);

  const updateVariant = (i: number, field: keyof VariantForm, value: string) =>
    setVariants((v) => v.map((row, j) => (j === i ? { ...row, [field]: value } : row)));

  const removeVariant = (i: number) => {
    if (variants.length <= 1) return;
    setVariants((v) => v.filter((_, j) => j !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const vars = variants
      .filter((v) => v.sku.trim() && v.price.trim())
      .map((v, i) => ({
        size: v.size.trim(),
        color: v.color.trim(),
        sku: v.sku.trim(),
        barcode: v.barcode.trim() || undefined,
        price: parseFloat(v.price) || 0,
        costPrice: v.costPrice.trim() ? parseFloat(v.costPrice) : undefined,
        id: editProduct?.variants[i]?.id,
      }));

    if (vars.length === 0) {
      setCreateError(t("inventory.variantAtLeastOne"));
      setCreating(false);
      return;
    }

    const resolvedCategory =
      category === "__new__"
        ? categoryOther.trim() || undefined
        : category.trim() || undefined;

    try {
      if (editProduct) {
        const res = await authFetch(`${API_BASE_URL}/products/${editProduct.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            category: resolvedCategory,
            brand: brand.trim() || undefined,
            variants: vars.map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              sku: v.sku,
              barcode: v.barcode,
              price: v.price,
              costPrice: v.costPrice,
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            (data as { message?: string }).message || t("inventory.productFormEditTitle")
          );
        onClose();
        onSuccess({ isNew: false });
        showToast(t("inventory.productUpdatedOk"));
      } else {
        const res = await authFetch(`${API_BASE_URL}/products`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            category: resolvedCategory,
            brand: brand.trim() || undefined,
            variants: vars.map((v) => ({
              size: v.size,
              color: v.color,
              sku: v.sku,
              barcode: v.barcode,
              price: v.price,
              costPrice: v.costPrice,
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            (data as { message?: string }).message || t("inventory.productFormTitle")
          );
        onClose();
        onSuccess({ isNew: true });
        showToast(t("inventory.productCreatedOk"));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setCreateError(msg);
      showToast(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-product-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-600">
          <h2
            id="new-product-title"
            className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {editProduct ? t("inventory.productFormEditTitle") : t("inventory.productFormTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={t("inventory.productFormClose")}
          >
            <span className="sr-only">{t("inventory.productFormClose")}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col min-h-0 flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Datos del producto */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">
                {t("inventory.productDataSection")}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="product-name"
                    className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5"
                  >
                    {t("inventory.productNameLabel")}{" "}
                    <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    id="product-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                    placeholder="Ej. Remera básica algodón"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="product-desc"
                    className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5"
                  >
                    {t("inventory.productDescLabel")}
                  </label>
                  <input
                    id="product-desc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                    placeholder={t("inventory.productDescPlaceholder")}
                  />
                </div>
                <div>
                  <label
                    htmlFor="product-category"
                    className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5"
                  >
                    {t("inventory.productCategoryLabel")}
                  </label>
                  <select
                    id="product-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                  >
                    <option value="">{t("inventory.productNoCategoryOption")}</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__new__">{t("inventory.productNewCategoryOption")}</option>
                  </select>
                  {category === "__new__" && (
                    <input
                      type="text"
                      value={categoryOther}
                      onChange={(e) => setCategoryOther(e.target.value)}
                      className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400 mt-2"
                      placeholder={t("inventory.productNewCategoryPlaceholder")}
                    />
                  )}
                </div>
                <div>
                  <label
                    htmlFor="product-brand"
                    className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5"
                  >
                    {t("inventory.productBrandLabel")}
                  </label>
                  <input
                    id="product-brand"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                    placeholder={t("inventory.productDescPlaceholder")}
                  />
                </div>
              </div>
            </section>

            {/* Variantes */}
            <VariantManager
              variants={variants}
              onAdd={addVariant}
              onUpdate={updateVariant}
              onRemove={removeVariant}
            />

            {createError && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                {createError}
              </div>
            )}
          </div>

          {/* Footer fijo */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              {t("branches.cancel")}
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
            >
              {creating
                ? editProduct
                  ? t("inventory.productSaving")
                  : t("inventory.productCreating")
                : editProduct
                ? t("inventory.productSave")
                : t("inventory.productCreate")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
