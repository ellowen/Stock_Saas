import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, authFetch, authHeaders } from "../../lib/api";
import type { PaymentMethod } from "../sales/types";

type ARStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

type AR = {
  id: number;
  amount: string;
  paid: string;
  status: ARStatus;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  customer: { id: number; name: string; taxId: string | null };
  payments: Array<{ id: number; amount: string; method: string; createdAt: string }>;
};

const STATUS_LABELS: Record<ARStatus, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  PAID: "Pagada",
  OVERDUE: "Vencida",
};

const STATUS_CLASSES: Record<ARStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function AccountsPage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<AR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const res = await authFetch(`${API_BASE_URL}/accounts-receivable${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar cuentas corrientes");
      setAccounts(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handlePay = async (ar: AR) => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    setPaySubmitting(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/accounts-receivable/${ar.id}/pay`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount, method: payMethod, notes: payNotes || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      setPayingId(null);
      setPayAmount("");
      setPayNotes("");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al registrar pago");
    } finally {
      setPaySubmitting(false);
    }
  };

  const pending = accounts.filter((a) => a.status !== "PAID");
  const totalDebt = pending.reduce((s, a) => s + (Number(a.amount) - Number(a.paid)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("accounts.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("accounts.subtitle")}</p>
        </div>
        {totalDebt > 0 && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <p className="text-xs text-amber-600 dark:text-amber-400">{t("accounts.totalPending")}</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">${totalDebt.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["", "PENDING", "PARTIAL", "OVERDUE", "PAID"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filterStatus === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
            }`}
          >
            {s === "" ? t("accounts.filterAll") : STATUS_LABELS[s as ARStatus]}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t("accounts.loading")}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">{t("accounts.empty")}</div>
      ) : (
        <div className="space-y-3">
          {accounts.map((ar) => {
            const remaining = Number(ar.amount) - Number(ar.paid);
            return (
              <div
                key={ar.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{ar.customer.name}</p>
                    {ar.customer.taxId && (
                      <p className="text-xs text-slate-400">{ar.customer.taxId}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(ar.createdAt).toLocaleDateString("es-AR")}
                      {ar.dueDate && ` · Vence: ${new Date(ar.dueDate).toLocaleDateString("es-AR")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASSES[ar.status]}`}>
                      {STATUS_LABELS[ar.status]}
                    </span>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
                      ${Number(ar.amount).toFixed(2)}
                    </p>
                    {Number(ar.paid) > 0 && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Pagado: ${Number(ar.paid).toFixed(2)}
                      </p>
                    )}
                    {remaining > 0 && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        {t("accounts.balance")}: ${remaining.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {ar.payments.length > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-2">
                    {ar.payments.map((p) => (
                      <p key={p.id}>
                        · ${Number(p.amount).toFixed(2)} ({p.method}) — {new Date(p.createdAt).toLocaleDateString("es-AR")}
                      </p>
                    ))}
                  </div>
                )}

                {ar.status !== "PAID" && (
                  payingId === ar.id ? (
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                      <input
                        type="number"
                        min={0.01}
                        max={remaining}
                        step={0.01}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder={remaining.toFixed(2)}
                        className="input-minimal w-32 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                        autoFocus
                      />
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                        className="input-minimal text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      >
                        <option value="CASH">Efectivo</option>
                        <option value="CARD">Tarjeta</option>
                        <option value="OTHER">Otro</option>
                      </select>
                      <input
                        type="text"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder={t("accounts.payNotesPlaceholder")}
                        className="input-minimal flex-1 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => handlePay(ar)}
                        disabled={paySubmitting || !payAmount}
                        className="btn-primary text-sm disabled:opacity-50"
                      >
                        {paySubmitting ? "…" : t("accounts.payConfirm")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPayingId(null); setPayAmount(""); }}
                        className="btn-secondary text-sm"
                      >
                        {t("branches.cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setPayingId(ar.id); setPayAmount(remaining.toFixed(2)); }}
                      className="btn-primary text-sm"
                    >
                      {t("accounts.pay")}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
