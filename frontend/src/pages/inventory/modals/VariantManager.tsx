import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, authFetch, authHeaders } from "../../../lib/api";
import type { AttributeDefinition, VariantForm } from "../types";

type Props = {
  variants: VariantForm[];
  onAdd: () => void;
  onUpdate: (i: number, field: keyof VariantForm, value: string) => void;
  onRemove: (i: number) => void;
};

export function VariantManager({ variants, onAdd, onUpdate, onRemove }: Props) {
  const { t } = useTranslation();
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);

  const loadAttributes = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/attributes`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setAttributes(Array.isArray(data) ? data : []);
    } catch {
      // ignore — fall back to legacy size/color fields
    }
  }, []);

  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  // When there are flex attributes, we render dynamic fields using the
  // `size` field as a serialized JSON map (attributeId -> value).
  // For backwards compatibility we also keep SKU, barcode, price, costPrice.
  const hasFlexAttributes = attributes.length > 0;

  const getAttrValue = (variant: VariantForm, attrId: number): string => {
    try {
      const parsed = JSON.parse(variant.size || "{}") as Record<string, string>;
      return parsed[String(attrId)] ?? "";
    } catch {
      return "";
    }
  };

  const setAttrValue = (
    variantIndex: number,
    attrId: number,
    value: string,
    currentVariant: VariantForm
  ) => {
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(currentVariant.size || "{}") as Record<string, string>;
    } catch {
      parsed = {};
    }
    parsed[String(attrId)] = value;
    onUpdate(variantIndex, "size", JSON.stringify(parsed));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-600 pb-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("inventory.variantsSection")}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("inventory.addVariant")}
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {hasFlexAttributes
          ? t("inventory.variantFlexHint")
          : t("inventory.variantLegacyHint")}
      </p>
      <div className="space-y-4">
        {variants.map((v, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t("inventory.variantN", { n: i + 1 })}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={variants.length <= 1}
                className="rounded-md p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-950/30 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label={t("inventory.variantRemoveLabel", { n: i + 1 })}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hasFlexAttributes ? (
                // --- Flexible attribute fields ---
                attributes.map((attr) => (
                  <div key={attr.id}>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {attr.name}
                    </label>
                    {attr.type === "SELECT" && attr.options && attr.options.length > 0 ? (
                      <select
                        value={getAttrValue(v, attr.id)}
                        onChange={(e) => setAttrValue(i, attr.id, e.target.value, v)}
                        className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      >
                        <option value="">{t("inventory.variantSelectPlaceholder")}</option>
                        {attr.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={attr.type === "NUMBER" ? "number" : "text"}
                        placeholder={attr.name}
                        value={getAttrValue(v, attr.id)}
                        onChange={(e) => setAttrValue(i, attr.id, e.target.value, v)}
                        className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                      />
                    )}
                  </div>
                ))
              ) : (
                // --- Legacy size / color fields ---
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {t("inventory.variantTalleLabel")}
                    </label>
                    <input
                      placeholder={t("inventory.variantTallePlaceholder")}
                      value={v.size}
                      onChange={(e) => onUpdate(i, "size", e.target.value)}
                      className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {t("inventory.variantColorLabel")}
                    </label>
                    <input
                      placeholder={t("inventory.variantColorPlaceholder")}
                      value={v.color}
                      onChange={(e) => onUpdate(i, "color", e.target.value)}
                      className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                    />
                  </div>
                </>
              )}

              {/* SKU, barcode, price, costPrice — always shown */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t("inventory.variantSkuLabel")}
                </label>
                <input
                  placeholder={t("inventory.variantSkuPlaceholder")}
                  value={v.sku}
                  onChange={(e) => onUpdate(i, "sku", e.target.value)}
                  className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t("inventory.variantBarcodeLabel")}
                </label>
                <input
                  placeholder={t("inventory.variantBarcodePlaceholder")}
                  value={v.barcode}
                  onChange={(e) => onUpdate(i, "barcode", e.target.value)}
                  className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                  autoFocus={i === 0}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t("inventory.variantPriceLabel")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={v.price}
                  onChange={(e) => onUpdate(i, "price", e.target.value)}
                  className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t("inventory.variantCostLabel")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={v.costPrice}
                  onChange={(e) => onUpdate(i, "costPrice", e.target.value)}
                  className="input-minimal dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
