import { forwardRef } from "react";

export interface DocumentItemRow {
  description: string;
  sku?: string;
  attributeLabel?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxAmount?: number;
  totalPrice: number;
}

export interface CompanyInfo {
  name: string;
  legalName?: string;
  taxId?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  currency?: string;
}

export interface CustomerInfo {
  name: string;
  taxId?: string;
  taxType?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
}

export type DocType = "QUOTE" | "REMITO" | "INVOICE" | "CREDIT_NOTE";

export interface DocumentData {
  type: DocType;
  number: number;
  date: string; // ISO string
  dueDate?: string;
  notes?: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  items: DocumentItemRow[];
  customer?: CustomerInfo | null;
  branch?: { name: string; code: string };
}

interface Props {
  document: DocumentData;
  company: CompanyInfo;
  showPrices?: boolean;
  showTaxes?: boolean;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  QUOTE: "Presupuesto",
  REMITO: "Remito",
  INVOICE: "Factura",
  CREDIT_NOTE: "Nota de Crédito",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export const DocumentTemplate = forwardRef<HTMLDivElement, Props>(
  function DocumentTemplate(
    { document: doc, company, showPrices = true, showTaxes = true },
    ref
  ) {
    const currency = company.currency ?? "ARS";
    const fmt = (n: number) => formatCurrency(n, currency);

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "13px",
          color: "#1e293b",
          background: "#fff",
          width: "794px",
          minHeight: "1123px",
          padding: "48px 56px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>{company.name}</div>
            {company.legalName && (
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{company.legalName}</div>
            )}
            {company.taxId && (
              <div style={{ fontSize: "12px", color: "#64748b" }}>CUIT/RUC: {company.taxId}</div>
            )}
            {company.address && (
              <div style={{ fontSize: "12px", color: "#64748b" }}>{company.address}{company.city ? `, ${company.city}` : ""}</div>
            )}
            {(company.phone || company.email) && (
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {[company.phone, company.email].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "1px" }}>
              {DOC_TYPE_LABELS[doc.type]}
            </div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b", marginTop: "4px" }}>
              N° {String(doc.number).padStart(8, "0")}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
              Fecha: {formatDate(doc.date)}
            </div>
            {doc.dueDate && (
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Vence: {formatDate(doc.dueDate)}
              </div>
            )}
            {doc.branch && (
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                Sucursal: {doc.branch.name} ({doc.branch.code})
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "2px solid #e2e8f0", marginBottom: "24px" }} />

        {/* Customer */}
        {doc.customer && (
          <div style={{ marginBottom: "24px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              Cliente / Destinatario
            </div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>{doc.customer.name}</div>
            {doc.customer.taxId && (
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {doc.customer.taxType ?? "CUIT"}: {doc.customer.taxId}
              </div>
            )}
            {doc.customer.address && (
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {doc.customer.address}{doc.customer.city ? `, ${doc.customer.city}` : ""}
              </div>
            )}
            {(doc.customer.phone || doc.customer.email) && (
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {[doc.customer.phone, doc.customer.email].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        )}

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={thStyle}>Cant.</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Descripción</th>
              {showPrices && <th style={thStyle}>P. Unit.</th>}
              {showPrices && <th style={thStyle}>Dto.</th>}
              {showPrices && showTaxes && <th style={thStyle}>IVA</th>}
              {showPrices && <th style={thStyle}>Total</th>}
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ ...tdStyle, textAlign: "center", width: "60px" }}>
                  {Number(item.quantity)}
                </td>
                <td style={{ ...tdStyle, textAlign: "left" }}>
                  <span style={{ fontWeight: 500 }}>{item.description}</span>
                  {item.attributeLabel && (
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>{item.attributeLabel}</span>
                  )}
                  {item.sku && (
                    <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>SKU: {item.sku}</span>
                  )}
                </td>
                {showPrices && (
                  <td style={{ ...tdStyle, textAlign: "right", width: "90px" }}>
                    {fmt(Number(item.unitPrice))}
                  </td>
                )}
                {showPrices && (
                  <td style={{ ...tdStyle, textAlign: "right", width: "70px" }}>
                    {Number(item.discount ?? 0) > 0 ? fmt(Number(item.discount)) : "—"}
                  </td>
                )}
                {showPrices && showTaxes && (
                  <td style={{ ...tdStyle, textAlign: "right", width: "70px" }}>
                    {Number(item.taxAmount ?? 0) > 0 ? fmt(Number(item.taxAmount)) : "—"}
                  </td>
                )}
                {showPrices && (
                  <td style={{ ...tdStyle, textAlign: "right", width: "90px", fontWeight: 600 }}>
                    {fmt(Number(item.totalPrice))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        {showPrices && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
            <div style={{ width: "240px" }}>
              <div style={totRowStyle}>
                <span style={{ color: "#64748b" }}>Subtotal</span>
                <span>{fmt(doc.subtotal)}</span>
              </div>
              {doc.discountTotal > 0 && (
                <div style={totRowStyle}>
                  <span style={{ color: "#64748b" }}>Descuentos</span>
                  <span style={{ color: "#dc2626" }}>- {fmt(doc.discountTotal)}</span>
                </div>
              )}
              {showTaxes && doc.taxTotal > 0 && (
                <div style={totRowStyle}>
                  <span style={{ color: "#64748b" }}>Impuestos</span>
                  <span>{fmt(doc.taxTotal)}</span>
                </div>
              )}
              <div style={{ ...totRowStyle, borderTop: "2px solid #1e293b", paddingTop: "8px", marginTop: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "15px" }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "#4f46e5" }}>{fmt(doc.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {doc.notes && (
          <div style={{ marginTop: "16px", padding: "12px 16px", background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", color: "#64748b" }}>
            <span style={{ fontWeight: 600 }}>Notas: </span>{doc.notes}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "40px", borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Generado por GIRO</span>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Condición de venta: Contado</span>
        </div>
      </div>
    );
  }
);

const thStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: "11px",
  fontWeight: 600,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  textAlign: "right",
  borderBottom: "2px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: "12px",
  verticalAlign: "top",
};

const totRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
  fontSize: "13px",
};
