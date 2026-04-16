import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../../lib/format";
import { PAYMENT_LABELS, type Branch, type SaleListItem } from "../types";
import { ReturnModal } from "../components/ReturnModal";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { Badge } from "../../../components/ui/Badge";
import type { ReturnItemInput } from "../hooks/useSales";

type Props = {
  branches: Branch[];
  historySales: SaleListItem[];
  historyLoading: boolean;
  historyError: string | null;
  onLoadHistory: (filters: { branchId?: string; from?: string; to?: string }) => void;
  onCancelSale: (saleId: number) => Promise<void>;
  onReturnItems: (saleId: number, items: ReturnItemInput[], reason: string) => Promise<void>;
};

export function SalesHistoryTab({
  branches,
  historySales,
  historyLoading,
  historyError,
  onLoadHistory,
  onCancelSale,
  onReturnItems,
}: Props) {
  const { t } = useTranslation();
  const [historyBranchId, setHistoryBranchId] = useState<string>("");
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [historyTo, setHistoryTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [returnSale, setReturnSale] = useState<SaleListItem | null>(null);
  const [confirmData, setConfirmData] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: "", onConfirm: () => {} });

  const handleFilter = () => {
    onLoadHistory({
      branchId: historyBranchId || undefined,
      from: historyFrom || undefined,
      to: historyTo || undefined,
    });
  };

  const handleCancel = (sale: SaleListItem) => {
    setConfirmData({
      open: true,
      message: t("sales.cancelConfirm", { id: sale.id }),
      onConfirm: () => _doCancel(sale),
    });
  };

  const _doCancel = async (sale: SaleListItem) => {
    setCancellingId(sale.id);
    try {
      await onCancelSale(sale.id);
      onLoadHistory({ branchId: historyBranchId || undefined, from: historyFrom, to: historyTo });
    } finally {
      setCancellingId(null);
    }
  };

  const STATUS_VARIANTS: Record<string, "success" | "danger" | "warning" | "neutral"> = {
    COMPLETED: "success",
    CANCELLED: "danger",
    REFUNDED: "warning",
    PENDING: "neutral",
  };

  const statusBadge = (status: string) => (
    <Badge variant={STATUS_VARIANTS[status] ?? "neutral"} size="sm">
      {t(`sales.status${status}`, { defaultValue: status })}
    </Badge>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("sales.historyBranchLabel")}
          </label>
          <select
            value={historyBranchId}
            onChange={(e) => setHistoryBranchId(e.target.value)}
            className="input-minimal min-w-[180px] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">{t("sales.historyAllBranches")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("sales.historyFromLabel")}
          </label>
          <input
            type="date"
            value={historyFrom}
            onChange={(e) => setHistoryFrom(e.target.value)}
            className="input-minimal dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t("sales.historyToLabel")}
          </label>
          <input
            type="date"
            value={historyTo}
            onChange={(e) => setHistoryTo(e.target.value)}
            className="input-minimal dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={handleFilter}
          className="btn-secondary text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          {t("sales.historyFilter")}
        </button>
      </div>

      {historyError && (
        <p className="text-sm text-red-600 dark:text-red-400">{historyError}</p>
      )}

      <div className="table-modern">
        {historyLoading ? (
          <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            {t("sales.historyLoading")}
          </div>
        ) : historySales.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            <p>{t("sales.historyEmpty")}</p>
            <p className="mt-1 text-xs opacity-90">{t("sales.historyEmptyHint")}</p>
          </div>
        ) : (
          <table className="min-w-[620px]">
            <thead>
              <tr>
                <th className="font-medium">{t("sales.historyColDateTime")}</th>
                <th className="font-medium">{t("sales.historyColBranch")}</th>
                <th className="font-medium">{t("sales.historyColTotal")}</th>
                <th className="font-medium">{t("sales.historyColItems")}</th>
                <th className="font-medium">{t("sales.historyColPayment")}</th>
                <th className="font-medium">{t("sales.historyColSeller")}</th>
                <th className="font-medium">{t("sales.historyColStatus")}</th>
                <th className="font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {historySales.map((s) => (
                <tr key={s.id}>
                  <td>
                    {new Date(s.createdAt).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    {s.branch.name} ({s.branch.code})
                  </td>
                  <td className="font-mono text-right">{formatCurrency(s.totalAmount)}</td>
                  <td>{s.totalItems}</td>
                  <td>{PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}</td>
                  <td>{s.user.fullName}</td>
                  <td>{statusBadge(s.status)}</td>
                  <td>
                    {s.status === "COMPLETED" && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCancel(s)}
                          disabled={cancellingId === s.id}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 px-1"
                        >
                          {cancellingId === s.id ? "…" : t("sales.cancel")}
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => setReturnSale(s)}
                          className="text-xs text-amber-600 dark:text-amber-400 hover:underline px-1"
                        >
                          {t("sales.return")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {returnSale && (
        <ReturnModal
          sale={returnSale}
          onClose={() => setReturnSale(null)}
          onConfirm={async (items, reason) => {
            await onReturnItems(returnSale.id, items, reason);
            onLoadHistory({ branchId: historyBranchId || undefined, from: historyFrom, to: historyTo });
          }}
        />
      )}

      <ConfirmModal
        open={confirmData.open}
        title={t("sales.cancelTitle", { defaultValue: "Anular venta" })}
        message={confirmData.message}
        confirmLabel={t("sales.cancelConfirmBtn", { defaultValue: "Anular" })}
        variant="danger"
        onConfirm={confirmData.onConfirm}
        onClose={() => setConfirmData((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
