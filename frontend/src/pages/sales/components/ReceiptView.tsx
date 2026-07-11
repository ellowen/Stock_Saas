import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../../lib/format";
import { openReceiptPrint, downloadReceiptHtml, buildWhatsAppReceiptLink } from "../types";
import type { ReceiptPrintData } from "../types";

type Props = {
  receipt: { total: number; paid: number; change: number } | null;
  lastSaleReceipt: ReceiptPrintData | null;
  successMessage: string | null;
  onGenerateDocument?: (type: "REMITO" | "INVOICE") => void;
  saleId?: number | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  onSendEmail?: (saleId: number, email: string) => Promise<void>;
};

/** Boton "Email" que despliega un input inline para confirmar/editar la direccion antes de mandar. */
function EmailReceiptControl({
  saleId,
  defaultEmail,
  onSendEmail,
  labelClassName,
}: {
  saleId: number;
  defaultEmail: string | null;
  onSendEmail: (saleId: number, email: string) => Promise<void>;
  labelClassName: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={labelClassName}>
        {t("sales.emailReceipt")}
      </button>
    );
  }

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    setStatus("idle");
    try {
      await onSendEmail(saleId, email.trim());
      setStatus("sent");
    } catch {
      setStatus("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("sales.emailPlaceholder")}
        className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 w-40"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={sending || !email.trim()}
        className="text-xs font-medium px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {sending ? "..." : t("sales.emailSend")}
      </button>
      {status === "sent" && <span className="text-xs text-emerald-600 dark:text-emerald-400">{t("sales.emailSent")}</span>}
      {status === "error" && <span className="text-xs text-red-600 dark:text-red-400">{t("sales.emailError")}</span>}
    </div>
  );
}

export function ReceiptView({
  receipt,
  lastSaleReceipt,
  successMessage,
  onGenerateDocument,
  saleId,
  customerEmail,
  customerPhone,
  onSendEmail,
}: Props) {
  const { t } = useTranslation();
  const whatsAppLink = lastSaleReceipt ? buildWhatsAppReceiptLink(lastSaleReceipt, customerPhone ?? null) : null;

  return (
    <>
      {/* Inline success banner */}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-5 py-4 text-base text-emerald-800 dark:text-emerald-200 space-y-3">
          <p>{successMessage}</p>
          {lastSaleReceipt && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => openReceiptPrint(lastSaleReceipt)}
                className="text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1.5"
              >
                {t("sales.printReceipt")}
              </button>
              <span className="text-emerald-400 dark:text-emerald-500">·</span>
              <button
                type="button"
                onClick={() => downloadReceiptHtml(lastSaleReceipt)}
                className="text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1.5"
              >
                {t("sales.downloadReceipt")}
              </button>
              {whatsAppLink && (
                <>
                  <span className="text-emerald-400 dark:text-emerald-500">·</span>
                  <a
                    href={whatsAppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1.5"
                  >
                    {t("sales.whatsAppReceipt")}
                  </a>
                </>
              )}
              {saleId != null && onSendEmail && (
                <>
                  <span className="text-emerald-400 dark:text-emerald-500">·</span>
                  <EmailReceiptControl
                    saleId={saleId}
                    defaultEmail={customerEmail ?? null}
                    onSendEmail={onSendEmail}
                    labelClassName="text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Receipt overlay modal (auto-dismiss) */}
      {receipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-label="Recibo de venta"
        >
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 shadow-2xl p-8 max-w-sm w-full text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-4">
              {t("sales.receiptSaleRegistered")}
            </p>
            <div className="space-y-3 text-lg">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t("sales.receiptTotal")}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(receipt.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t("sales.receiptPaid")}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(receipt.paid)}
                </span>
              </div>
              {receipt.change > 0 && (
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {t("sales.receiptChange")}
                  </span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(receipt.change)}
                  </span>
                </div>
              )}
            </div>
            {onGenerateDocument && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {t("sales.generateDocumentHint")}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onGenerateDocument("REMITO")}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {t("sales.generateRemito")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onGenerateDocument("INVOICE")}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    {t("sales.generateInvoice")}
                  </button>
                </div>
              </div>
            )}
            {lastSaleReceipt && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => openReceiptPrint(lastSaleReceipt)}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t("sales.printReceipt")}
                </button>
                <button
                  type="button"
                  onClick={() => downloadReceiptHtml(lastSaleReceipt)}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t("sales.downloadReceiptShort")}
                </button>
                {whatsAppLink && (
                  <a
                    href={whatsAppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t("sales.whatsAppReceiptShort")}
                  </a>
                )}
              </div>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">{t("sales.receiptAutoClose")}</p>
          </div>
        </div>
      )}
    </>
  );
}
