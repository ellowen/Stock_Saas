import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IconCurrency } from "../../../components/Icons";
import { PAYMENT_METHODS, PAYMENT_METHOD_KEYS, type PaymentMethod } from "../types";

type Props = {
  open: boolean;
  totalAmount: number;
  hasCustomer?: boolean;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  cashReceived: string;
  onCashReceivedChange: (val: string) => void;
  mixedCash: string;
  onMixedCashChange: (val: string) => void;
  mixedCard: string;
  onMixedCardChange: (val: string) => void;
  mixedCashReceived: string;
  onMixedCashReceivedChange: (val: string) => void;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PaymentModal({
  open,
  totalAmount,
  hasCustomer = false,
  paymentMethod,
  onPaymentMethodChange,
  cashReceived,
  onCashReceivedChange,
  mixedCash,
  onMixedCashChange,
  mixedCard,
  onMixedCardChange,
  mixedCashReceived,
  onMixedCashReceivedChange,
  submitting,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const totalRounded = Math.round(totalAmount * 100) / 100;
  const cashNum = parseFloat(mixedCash) || 0;
  const cardNum = parseFloat(mixedCard) || 0;
  const mixedSum = Math.round((cashNum + cardNum) * 100) / 100;
  const mixedValid =
    paymentMethod !== "MIXED" || (mixedSum === totalRounded && cashNum >= 0 && cardNum >= 0);
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const cashChange = Math.round((cashReceivedNum - totalRounded) * 100) / 100;
  const cashValid = paymentMethod !== "CASH" || cashReceivedNum >= totalRounded;
  const mixedCashReceivedNum = parseFloat(mixedCashReceived) || 0;
  const mixedCashChange = Math.round((mixedCashReceivedNum - cashNum) * 100) / 100;

  // Keyboard shortcuts (1-4 for payment methods, Enter to confirm)
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;
      if (!isInput && ["1", "2", "3", "4"].includes(e.key)) {
        const methods: PaymentMethod[] = ["CASH", "CARD", "MIXED", "OTHER"];
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < 4) {
          e.preventDefault();
          onPaymentMethodChange(methods[idx]);
          if (methods[idx] === "CASH") onCashReceivedChange(totalRounded.toFixed(2));
        }
        return;
      }
      if (e.key === "Enter") {
        if (!submitting && mixedValid && cashValid) {
          e.preventDefault();
          onConfirm();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, mixedValid, cashValid, totalRounded, onPaymentMethodChange, onCashReceivedChange, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl p-6 space-y-6">
        <h2 id="payment-modal-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {t("sales.paymentTitle")}
        </h2>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
          {t("sales.paymentTotal")} ${totalAmount.toFixed(2)}
        </p>

        {/* Payment method selector */}
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            {t("sales.paymentMethodLabel")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m, idx) => {
              const isCreditDisabled = m.value === "CREDIT" && !hasCustomer;
              return (
                <button
                  key={m.value}
                  type="button"
                  disabled={isCreditDisabled}
                  onClick={() => {
                    if (isCreditDisabled) return;
                    onPaymentMethodChange(m.value);
                    if (m.value === "CASH") onCashReceivedChange(totalRounded.toFixed(2));
                  }}
                  title={isCreditDisabled ? t("sales.paymentCreditNeedsCustomer") : undefined}
                  className={`py-3 px-4 rounded-xl border-2 text-base font-medium transition-colors flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed ${
                    paymentMethod === m.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-500"
                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                  aria-keyshortcuts={idx < 4 ? String(idx + 1) : undefined}
                >
                  <span>{t(PAYMENT_METHOD_KEYS[m.value] ?? m.value)}</span>
                  {idx < 4 && <span className="text-xs font-normal opacity-70">({idx + 1})</span>}
                </button>
              );
            })}
          </div>
          {paymentMethod === "CREDIT" && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2">
              {t("sales.paymentCreditInfo")}
            </p>
          )}
        </div>

        {/* Cash section */}
        {paymentMethod === "CASH" && (
          <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              {t("sales.cashReceived")}
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={cashReceived}
              onChange={(e) => onCashReceivedChange(e.target.value)}
              placeholder={totalRounded.toFixed(2)}
              className="input-minimal text-lg font-semibold"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {[
                { label: t("sales.cashExact"), value: totalRounded },
                { label: "+10", value: totalRounded + 10 },
                { label: "+20", value: totalRounded + 20 },
                { label: "+50", value: totalRounded + 50 },
                { label: "+100", value: totalRounded + 100 },
                { label: "+200", value: totalRounded + 200 },
                { label: "+500", value: totalRounded + 500 },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onCashReceivedChange(value.toFixed(2))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-500"
                >
                  {label}
                </button>
              ))}
            </div>
            <p
              className={`text-lg font-bold ${
                cashChange >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {cashChange >= 0
                ? t("sales.cashChange", { amount: cashChange.toFixed(2) })
                : t("sales.cashShort", { amount: Math.abs(cashChange).toFixed(2) })}
            </p>
          </div>
        )}

        {/* Mixed section */}
        {paymentMethod === "MIXED" && (
          <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t("sales.mixedBreakdown")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t("sales.mixedCashLabel")}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={mixedCash}
                  onChange={(e) => {
                    const val = e.target.value;
                    onMixedCashChange(val);
                    const n = parseFloat(val) || 0;
                    const rest = Math.round(Math.max(0, totalAmount - n) * 100) / 100;
                    onMixedCardChange(rest > 0 ? rest.toFixed(2) : "");
                  }}
                  placeholder="0.00"
                  className="input-minimal"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t("sales.mixedCardLabel")}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={mixedCard}
                  onChange={(e) => {
                    const val = e.target.value;
                    onMixedCardChange(val);
                    const n = parseFloat(val) || 0;
                    const rest = Math.round(Math.max(0, totalAmount - n) * 100) / 100;
                    onMixedCashChange(rest > 0 ? rest.toFixed(2) : "");
                  }}
                  placeholder="0.00"
                  className="input-minimal"
                />
              </div>
            </div>
            <p
              className={`text-sm ${
                mixedSum === totalRounded
                  ? "text-slate-600 dark:text-slate-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {t("sales.mixedSumLabel", { sum: mixedSum.toFixed(2) })}
              {mixedSum === totalRounded && " ✓"}
              {mixedSum !== totalRounded && ` ${t("sales.mixedSumShort", { amount: (totalRounded - mixedSum).toFixed(2) })}`}
            </p>
            {cashNum > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-500 space-y-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("sales.mixedCashReceivedLabel")}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={mixedCashReceived}
                  onChange={(e) => onMixedCashReceivedChange(e.target.value)}
                  placeholder={cashNum.toFixed(2)}
                  className="input-minimal"
                />
                {mixedCashReceivedNum > 0 && (
                  <p
                    className={`text-sm font-semibold ${
                      mixedCashChange >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {mixedCashChange >= 0
                      ? t("sales.mixedChange", { amount: mixedCashChange.toFixed(2) })
                      : t("sales.mixedShort", { amount: Math.abs(mixedCashChange).toFixed(2) })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn-secondary py-3 text-base font-medium dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200"
          >
            {t("sales.paymentCancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting || !mixedValid || !cashValid}
            className="flex-1 btn-primary py-3 text-base font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconCurrency className="w-5 h-5" />
            {submitting ? t("sales.paymentProcessing") : t("sales.paymentConfirm")}
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-1">
          {t("sales.paymentShortcuts")}
        </p>
      </div>
    </div>
  );
}
