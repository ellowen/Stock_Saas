import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { HeldSale } from "../hooks/useHeldSales";

type Props = {
  heldSales: HeldSale[];
  loading: boolean;
  onResume: (id: number) => void;
  onDiscard: (id: number) => void;
};

export function HeldSalesPanel({ heldSales, loading, onResume, onDiscard }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (heldSales.length === 0 && !loading) return null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
      >
        {t("sales.heldSales")}
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-600 text-white text-xs font-bold">
          {heldSales.length}
        </span>
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-80 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
          <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {heldSales.map((h) => {
              const itemCount = h.cart.reduce((s, c) => s + c.quantity, 0);
              return (
                <li key={h.id} className="px-3 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {h.customer?.name ?? t("sales.heldSaleWalkIn")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("sales.heldSaleItems", { count: itemCount })}
                      {h.note ? ` · ${h.note}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onResume(h.id); setOpen(false); }}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {t("sales.heldSaleResume")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDiscard(h.id)}
                    className="text-xs px-2 py-1 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {t("sales.heldSaleDiscard")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
