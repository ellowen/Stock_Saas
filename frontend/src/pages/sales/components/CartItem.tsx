import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../components/Tooltip";
import { IconMinus, IconPlus, IconX } from "../../../components/Icons";

type Props = {
  productName: string;
  sku: string;
  attributeLabel: string;
  price: number;
  quantity: number;
  discount: number;
  priceOverride?: number;
  promoDiscount?: number;
  canDiscount: boolean;
  canOverridePrice: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onDiscountChange: (value: number) => void;
  onPriceOverrideChange: (value: number | null) => void;
};

export function CartItem({
  productName,
  sku,
  attributeLabel,
  price,
  quantity,
  discount,
  priceOverride,
  promoDiscount = 0,
  canDiscount,
  canOverridePrice,
  onIncrease,
  onDecrease,
  onRemove,
  onDiscountChange,
  onPriceOverrideChange,
}: Props) {
  const { t } = useTranslation();
  const [editingQty, setEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState("");
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const isOverridden = priceOverride != null;
  const effectivePrice = isOverridden ? priceOverride : price;
  const lineTotal = Math.max(0, (effectivePrice - discount) * quantity - promoDiscount * quantity);

  const startEditQty = () => {
    setQtyInput(String(quantity));
    setEditingQty(true);
    setTimeout(() => qtyInputRef.current?.select(), 0);
  };

  const commitQty = () => {
    const v = parseInt(qtyInput, 10);
    if (!isNaN(v) && v > 0) {
      // delta to target
      const delta = v - quantity;
      if (delta !== 0) {
        if (delta > 0) for (let i = 0; i < delta; i++) onIncrease();
        else for (let i = 0; i < -delta; i++) onDecrease();
      }
    }
    setEditingQty(false);
  };

  return (
    <li className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-slate-800 dark:text-slate-200 truncate">
          {productName} · {sku}
        </p>
        {attributeLabel && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{attributeLabel}</p>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {isOverridden ? (
            <>
              <span className="line-through text-slate-400 dark:text-slate-500">${price.toFixed(2)}</span>{" "}
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">${effectivePrice.toFixed(2)}</span>
            </>
          ) : (
            <>${price.toFixed(2)}</>
          )}
          {" "}× {quantity}
          {discount > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {" "}− ${(discount * quantity).toFixed(2)}
            </span>
          )}
          {" "}= <span className="font-medium text-slate-700 dark:text-slate-200">${lineTotal.toFixed(2)}</span>
        </p>
        {/* Descuento por linea — requiere permiso SALES_DISCOUNT */}
        {canDiscount ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs text-slate-400">{t("sales.discount")}:</span>
            <span className="text-xs text-slate-400">$</span>
            <input
              type="number"
              min={0}
              max={effectivePrice}
              step={0.01}
              value={discount === 0 ? "" : discount}
              placeholder="0"
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onDiscountChange(isNaN(v) || v < 0 ? 0 : Math.min(v, effectivePrice));
              }}
              className="w-20 text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="text-xs text-slate-400">{t("sales.discountPerUnit")}</span>
          </div>
        ) : (
          discount > 0 && (
            <p className="text-xs text-slate-400 mt-1.5">
              {t("sales.discount")}: ${discount.toFixed(2)} {t("sales.discountPerUnit")}
            </p>
          )
        )}
        {/* Override de precio — requiere permiso SALES_PRICE_OVERRIDE */}
        {canOverridePrice && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-slate-400">{t("sales.priceOverride")}:</span>
            <span className="text-xs text-slate-400">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={priceOverride ?? ""}
              placeholder={price.toFixed(2)}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") { onPriceOverrideChange(null); return; }
                const v = parseFloat(raw);
                onPriceOverrideChange(isNaN(v) || v < 0 ? null : v);
              }}
              className="w-20 text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        )}
        {promoDiscount > 0 && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
            {t("sales.promoApplied", { amount: (promoDiscount * quantity).toFixed(2) })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-1">
        <Tooltip content={t("sales.cartDecrease")}>
          <button
            type="button"
            onClick={onDecrease}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
          >
            <IconMinus className="w-5 h-5" />
          </button>
        </Tooltip>
        {editingQty ? (
          <input
            ref={qtyInputRef}
            type="number"
            min={1}
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)}
            onBlur={commitQty}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitQty();
              if (e.key === "Escape") setEditingQty(false);
            }}
            className="w-12 text-center text-base font-medium rounded border border-indigo-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 py-0.5"
          />
        ) : (
          <Tooltip content="Click para editar cantidad">
            <button
              type="button"
              onClick={startEditQty}
              className="min-w-[2rem] text-center text-base font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
            >
              {quantity}
            </button>
          </Tooltip>
        )}
        <Tooltip content={t("sales.cartIncrease")}>
          <button
            type="button"
            onClick={onIncrease}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
          >
            <IconPlus className="w-5 h-5" />
          </button>
        </Tooltip>
        <Tooltip content={t("sales.cartRemove")}>
          <button
            type="button"
            onClick={onRemove}
            className="p-2.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <IconX className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    </li>
  );
}
