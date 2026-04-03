import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DocumentTemplate } from "./DocumentTemplate";
import { usePrintDocument } from "./usePrintDocument";
import type { DocumentData, CompanyInfo } from "./DocumentTemplate";

interface Props {
  open: boolean;
  document: DocumentData;
  company: CompanyInfo;
  onClose: () => void;
}

export function DocumentPreviewModal({ open, document: doc, company, onClose }: Props) {
  const { t } = useTranslation();
  const [showPrices, setShowPrices] = useState(true);
  const { templateRef, printDocument, downloadPDF, isGenerating } = usePrintDocument();

  if (!open) return null;

  const typeLabels: Record<string, string> = {
    QUOTE: t("documents.typeQuote"),
    REMITO: t("documents.typeRemito"),
    INVOICE: t("documents.typeInvoice"),
    CREDIT_NOTE: t("documents.typeCreditNote"),
  };
  const filename = `${(typeLabels[doc.type] ?? doc.type).toLowerCase()}-${String(doc.number).padStart(6, "0")}.pdf`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl my-6 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-600">
          <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {t("documents.previewTitle")} — {typeLabels[doc.type] ?? doc.type} N° {String(doc.number).padStart(6, "0")}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {(doc.type === "REMITO") && (
              <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrices}
                  onChange={(e) => setShowPrices(e.target.checked)}
                  className="rounded"
                />
                {t("documents.showPrices")}
              </label>
            )}
            <button
              type="button"
              onClick={printDocument}
              disabled={isGenerating}
              className="btn-secondary py-2 px-4 text-sm"
            >
              {isGenerating ? t("documents.generating") : t("documents.print")}
            </button>
            <button
              type="button"
              onClick={() => downloadPDF(filename)}
              disabled={isGenerating}
              className="btn-primary py-2 px-4 text-sm"
            >
              {isGenerating ? t("documents.generating") : t("documents.downloadPdf")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-4 text-sm"
            >
              {t("documents.close")}
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="overflow-auto bg-slate-100 dark:bg-slate-900 p-6 flex justify-center">
          <div style={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
            <DocumentTemplate
              ref={templateRef}
              document={doc}
              company={company}
              showPrices={showPrices}
              showTaxes={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
