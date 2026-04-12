import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../../../lib/api";
import { useToast } from "../../../contexts/ToastContext";

type ImportResult = {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
};

const CSV_TEMPLATE = [
  "name,sku,barcode,price,costPrice,attributes,stock,branchCode,category,brand",
  "Remera Blanca,REM-001,7791234,1500,900,\"Talle:S,Color:Blanco\",10,SUC1,Remeras,Marca X",
  "Remera Blanca,REM-002,7791235,1500,900,\"Talle:M,Color:Blanco\",8,SUC1,Remeras,Marca X",
  "Pantalon Negro,PAN-001,,2500,,\"Talle:42,Color:Negro\",5,SUC1,Pantalones,",
].join("\r\n");

type Props = {
  onClose: () => void;
  onDone: () => void;
};

export function CsvImportModal({ onClose, onDone }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleDownloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-importacion.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/products/import-csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json() as ImportResult | { message: string };
      if (!res.ok) {
        throw new Error((data as { message: string }).message || t("inventory.importError"));
      }
      const importResult = data as ImportResult;
      setResult(importResult);
      if (importResult.errors.length === 0) {
        showToast(
          t("inventory.importSuccessClean", {
            created: importResult.created,
            updated: importResult.updated,
          })
        );
        onDone();
      } else {
        showToast(
          t("inventory.importSuccessWithErrors", {
            created: importResult.created,
            updated: importResult.updated,
            errors: importResult.errors.length,
          }),
          "info"
        );
        onDone();
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("inventory.importError"), "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-600">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("inventory.importTitle")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("inventory.importSubtitle")}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Step 1: Download template */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("inventory.importStep1")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("inventory.importTemplateDesc")}
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              {t("inventory.importDownloadTemplate")}
            </button>
          </div>

          {/* Step 2: Upload */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("inventory.importStep2")}
            </p>
            <div
              className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  {t("inventory.importDropzone")}
                </p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.created}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">{t("inventory.importCreated")}</p>
                </div>
                <div className="flex-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{result.updated}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-0.5">{t("inventory.importUpdated")}</p>
                </div>
                <div className="flex-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-center">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result.errors.length}</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{t("inventory.importErrors")}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                    {t("inventory.importErrorsDetail")}
                  </p>
                  <ul className="space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400">
                        <span className="font-medium">{t("inventory.importRow", { row: e.row })}:</span> {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-600 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t("branches.cancel")}
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={!file || processing}
            className="btn-primary disabled:opacity-50"
          >
            {processing ? t("inventory.importProcessing") : t("inventory.importProcess")}
          </button>
        </div>
      </div>
    </div>
  );
}
