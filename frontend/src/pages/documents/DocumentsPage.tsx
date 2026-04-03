import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { DocumentPreviewModal } from "../../components/documents/DocumentPreviewModal";
import type { DocumentData, CompanyInfo, DocumentItemRow } from "../../components/documents/DocumentTemplate";

const API = "/api";

type DocType = "QUOTE" | "REMITO" | "INVOICE" | "CREDIT_NOTE";
type DocStatus = "DRAFT" | "ISSUED" | "ACCEPTED" | "CANCELLED";

interface DocListItem {
  id: number;
  type: DocType;
  number: number;
  status: DocStatus;
  date: string;
  total: number | string;
  customer?: { id: number; name: string; taxId?: string } | null;
  branch?: { id: number; name: string; code: string };
  user?: { id: number; fullName: string };
  _count?: { items: number };
}

interface Branch { id: number; name: string; code: string }
interface Customer { id: number; name: string; taxId?: string; taxType?: string; address?: string; city?: string; email?: string; phone?: string }
interface TaxConfig { id: number; name: string; rate: number | string }

interface ItemRow {
  variantId?: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxConfigId?: number;
  _searchKey?: string;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  QUOTE: "Presupuesto",
  REMITO: "Remito",
  INVOICE: "Factura",
  CREDIT_NOTE: "Nota de Crédito",
};

const STATUS_LABELS: Record<DocStatus, string> = {
  DRAFT: "Borrador",
  ISSUED: "Emitido",
  ACCEPTED: "Aceptado",
  CANCELLED: "Anulado",
};

const STATUS_COLORS: Record<DocStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  ISSUED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const EMPTY_ITEM: ItemRow = { description: "", quantity: "1", unitPrice: "0", discount: "0" };

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { company } = useAuth();
  const [tab, setTab] = useState<"list" | "new">("list");

  // List state
  const [docs, setDocs] = useState<DocListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<DocType | "">("");
  const [filterStatus, setFilterStatus] = useState<DocStatus | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<{ data: DocumentData; company: CompanyInfo } | null>(null);

  // New document form
  const [docType, setDocType] = useState<DocType>("INVOICE");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);

  const authHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  });

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const res = await fetch(`${API}/documents?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } });
      if (!res.ok) throw new Error();
      setDocs(await res.json());
    } catch {
      addToast(t("documents.errorLoad"), "error");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterFrom, filterTo, t, addToast]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/branches`, { headers }).then((r) => r.json()),
      fetch(`${API}/customers`, { headers }).then((r) => r.json()),
      fetch(`${API}/tax-configs`, { headers }).then((r) => r.json()),
    ]).then(([b, c, tc]) => {
      setBranches(Array.isArray(b) ? b : []);
      setCustomers(Array.isArray(c) ? c : []);
      setTaxConfigs(Array.isArray(tc) ? tc : []);
    }).catch(() => {});
  }, []);

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    );
  }

  const subtotal = items.reduce((s, item) => {
    const base = parseFloat(item.unitPrice || "0") * parseFloat(item.quantity || "0");
    const disc = parseFloat(item.discount || "0");
    return s + base - disc;
  }, 0);
  const total = subtotal; // taxes handled server-side

  async function handleSubmit() {
    if (!branchId) { addToast(t("documents.branchRequired"), "error"); return; }
    if (items.length === 0 || !items[0].description.trim()) { addToast(t("documents.itemsRequired"), "error"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/documents`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({
          type: docType,
          branchId,
          customerId: customerId || undefined,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
          items: items.map((item) => ({
            variantId: item.variantId,
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            discount: parseFloat(item.discount) || 0,
            taxConfigId: item.taxConfigId,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      const created = await res.json();
      addToast(t("documents.created"), "success");
      setTab("list");
      loadDocs();

      // Open preview
      const selectedCustomer = customers.find((c) => c.id === customerId);
      const selectedBranch = branches.find((b) => b.id === branchId);
      setPreviewDoc({
        data: {
          type: docType,
          number: created.number,
          date: created.date ?? new Date().toISOString(),
          dueDate: created.dueDate,
          notes: created.notes,
          subtotal: Number(created.subtotal),
          taxTotal: Number(created.taxTotal),
          discountTotal: Number(created.discountTotal),
          total: Number(created.total),
          customer: selectedCustomer ?? null,
          branch: selectedBranch,
          items: (created.items ?? []).map((item: any): DocumentItemRow => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            taxAmount: Number(item.taxAmount),
            totalPrice: Number(item.totalPrice),
          })),
        },
        company: {
          name: company?.name ?? "",
          legalName: company?.legalName ?? undefined,
          taxId: company?.taxId ?? undefined,
          address: company?.address ?? undefined,
          city: company?.city ?? undefined,
          phone: company?.phone ?? undefined,
          email: company?.email ?? undefined,
          currency: company?.currency ?? "ARS",
        },
      });
    } catch (e: any) {
      addToast(e.message ?? t("documents.saveError"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm(t("documents.cancelConfirm"))) return;
    try {
      const res = await fetch(`${API}/documents/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error();
      addToast(t("documents.cancelled"), "success");
      loadDocs();
    } catch {
      addToast(t("documents.cancelError"), "error");
    }
  }

  async function handleConvert(id: number) {
    if (!confirm(t("documents.convertConfirm"))) return;
    try {
      const res = await fetch(`${API}/documents/${id}/convert-to-invoice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error();
      addToast(t("documents.converted"), "success");
      loadDocs();
    } catch {
      addToast(t("documents.convertError"), "error");
    }
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`${API}/documents/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPreviewDoc({
        data: {
          type: d.type,
          number: d.number,
          date: d.date,
          dueDate: d.dueDate ?? undefined,
          notes: d.notes ?? undefined,
          subtotal: Number(d.subtotal),
          taxTotal: Number(d.taxTotal),
          discountTotal: Number(d.discountTotal),
          total: Number(d.total),
          customer: d.customer ?? null,
          branch: d.branch,
          items: (d.items ?? []).map((item: any): DocumentItemRow => ({
            description: item.description,
            sku: item.variant?.sku,
            attributeLabel: item.variant?.attributes?.map((a: any) => a.value).join(" / "),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            taxAmount: Number(item.taxAmount),
            totalPrice: Number(item.totalPrice),
          })),
        },
        company: {
          name: company?.name ?? "",
          legalName: company?.legalName ?? undefined,
          taxId: company?.taxId ?? undefined,
          address: company?.address ?? undefined,
          city: company?.city ?? undefined,
          phone: company?.phone ?? undefined,
          email: company?.email ?? undefined,
          currency: company?.currency ?? "ARS",
        },
      });
    } catch {
      addToast(t("documents.errorLoad"), "error");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader title={t("documents.title")} subtitle={t("documents.subtitle")} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-600">
        {(["list", "new"] as const).map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tb
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            {tb === "list" ? t("documents.tabList") : t("documents.tabNew")}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as DocType | "")}
              className="input-minimal text-sm"
            >
              <option value="">{t("documents.allTypes")}</option>
              {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((tp) => (
                <option key={tp} value={tp}>{DOC_TYPE_LABELS[tp]}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DocStatus | "")}
              className="input-minimal text-sm"
            >
              <option value="">{t("documents.allStatuses")}</option>
              {(Object.keys(STATUS_LABELS) as DocStatus[]).map((st) => (
                <option key={st} value={st}>{STATUS_LABELS[st]}</option>
              ))}
            </select>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="input-minimal text-sm" />
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="input-minimal text-sm" />
          </div>

          {loading ? (
            <p className="text-slate-500 dark:text-slate-400">{t("documents.loading")}</p>
          ) : docs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <p>{t("documents.empty")}</p>
            </div>
          ) : (
            <div className="table-modern">
              <table>
                <thead>
                  <tr>
                    <th>{t("documents.colNumber")}</th>
                    <th>{t("documents.colType")}</th>
                    <th>{t("documents.colCustomer")}</th>
                    <th>{t("documents.colDate")}</th>
                    <th>{t("documents.colTotal")}</th>
                    <th>{t("documents.colStatus")}</th>
                    <th>{t("documents.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id}>
                      <td className="font-mono text-sm">N° {String(doc.number).padStart(6, "0")}</td>
                      <td>{DOC_TYPE_LABELS[doc.type]}</td>
                      <td className="text-slate-500 dark:text-slate-400">{doc.customer?.name ?? "—"}</td>
                      <td className="text-slate-500 dark:text-slate-400">
                        {new Date(doc.date).toLocaleDateString("es-AR")}
                      </td>
                      <td className="font-medium">${Number(doc.total).toFixed(2)}</td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[doc.status]}`}>
                          {STATUS_LABELS[doc.status]}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openPreview(doc.id)}
                            className="text-xs btn-secondary py-1 px-3"
                          >
                            {t("documents.actionPreview")}
                          </button>
                          {doc.type === "QUOTE" && doc.status === "ISSUED" && (
                            <button
                              type="button"
                              onClick={() => handleConvert(doc.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 py-1 px-2"
                            >
                              {t("documents.actionConvert")}
                            </button>
                          )}
                          {doc.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => handleCancel(doc.id)}
                              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 py-1 px-2"
                            >
                              {t("documents.actionCancel")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "new" && (
        <div className="space-y-6 max-w-3xl">
          {/* Doc type selector */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t("documents.typeLabel")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setDocType(tp)}
                  className={`py-3 px-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    docType === tp
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-500"
                      : "border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {DOC_TYPE_LABELS[tp]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("documents.branchLabel")} *
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
                className="input-minimal w-full"
              >
                <option value="">{t("documents.selectBranch")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("documents.customerLabel")}
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
                className="input-minimal w-full"
              >
                <option value="">{t("documents.noCustomer")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.taxId ? ` — ${c.taxId}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("documents.dueDateLabel")}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-minimal w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("documents.notesLabel")}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-minimal w-full"
                placeholder={t("documents.notesPlaceholder")}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t("documents.itemsLabel")}</p>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
                <span className="col-span-5">{t("documents.colItemDesc")}</span>
                <span className="col-span-2 text-right">{t("documents.colItemQty")}</span>
                <span className="col-span-2 text-right">{t("documents.colItemPrice")}</span>
                <span className="col-span-2 text-right">{t("documents.colItemDiscount")}</span>
                <span className="col-span-1" />
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    placeholder={t("documents.itemDescPlaceholder")}
                    className="input-minimal text-sm col-span-5"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    min={0.001}
                    step={0.001}
                    className="input-minimal text-sm col-span-2 text-right"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                    min={0}
                    step={0.01}
                    className="input-minimal text-sm col-span-2 text-right"
                  />
                  <input
                    type="number"
                    value={item.discount}
                    onChange={(e) => updateItem(idx, "discount", e.target.value)}
                    min={0}
                    step={0.01}
                    className="input-minimal text-sm col-span-2 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="col-span-1 text-red-500 hover:text-red-700 text-lg leading-none disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
            >
              + {t("documents.addItem")}
            </button>
          </div>

          {/* Totals preview */}
          <div className="flex justify-end">
            <div className="w-48 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t("documents.subtotal")}</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-1">
                <span className="font-semibold">{t("documents.total")}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTab("list")}
              className="btn-secondary py-2.5 px-5"
            >
              {t("documents.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary py-2.5 px-6"
            >
              {submitting ? t("documents.creating") : t("documents.create")}
            </button>
          </div>
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          open
          document={previewDoc.data}
          company={previewDoc.company}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
