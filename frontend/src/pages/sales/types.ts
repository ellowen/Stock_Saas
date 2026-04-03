export type Branch = { id: number; name: string; code: string };

export type VariantAttribute = { id: number; name: string; type: string; value: string };

export type VariantWithStock = {
  productVariantId: number;
  productName: string;
  sku: string;
  barcode: string | null;
  attributes: VariantAttribute[];
  price: string;
  availableQty: number;
};

export type InventoryRow = {
  id: number;
  quantity: number;
  branch: { id: number; name: string; code: string };
  variant: {
    id: number;
    sku: string;
    barcode: string | null;
    price: { toString(): string } | number | string;
    attributes?: VariantAttribute[];
    // legacy fields kept for fallback
    size?: string;
    color?: string;
    product: { name: string };
  };
};

export type CartEntry = { productVariantId: number; quantity: number; discount?: number };

export type PaymentMethod = "CASH" | "CARD" | "MIXED" | "OTHER" | "CREDIT";

export type ReceiptPrintData = {
  companyName: string;
  branchName: string;
  date: string;
  items: Array<{ name: string; sku: string; attributeLabel: string; qty: number; unitPrice: number; subtotal: number }>;
  total: number;
  paymentLabel: string;
  paid?: number;
  change?: number;
};

export type SaleListItem = {
  id: number;
  totalAmount: string | number;
  totalItems: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  branch: { id: number; name: string; code: string };
  user: { id: number; fullName: string; username: string };
  items: Array<{
    productVariantId: number;
    quantity: number;
    unitPrice: string | number;
    variant: { id: number; sku: string; product: { name: string } };
  }>;
};

export type SalesTab = "pos" | "historial";

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD", label: "Tarjeta" },
  { value: "MIXED", label: "Mixto" },
  { value: "OTHER", label: "Otro" },
  { value: "CREDIT", label: "Cuenta corriente" },
];

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  MIXED: "Mixto",
  OTHER: "Otro",
  CREDIT: "Cuenta corriente",
};

/** Maps payment method values to their i18n translation keys */
export const PAYMENT_METHOD_KEYS: Record<string, string> = {
  CASH: "sales.paymentCash",
  CARD: "sales.paymentCard",
  MIXED: "sales.paymentMixed",
  OTHER: "sales.paymentOther",
  CREDIT: "sales.paymentCredit",
};

export const MAX_SUGGESTIONS = 10;

/** Formats attributes array into a readable string like "Talle: M, Color: Rojo" */
export function formatAttributes(attributes: VariantAttribute[]): string {
  if (!attributes || attributes.length === 0) return "";
  return attributes.map((a) => `${a.name}: ${a.value}`).join(", ");
}

export function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

export function buildReceiptHtml(data: ReceiptPrintData): string {
  const rows = data.items
    .map(
      (i) =>
        `<tr>
          <td>${escapeHtml(i.name)}${i.attributeLabel ? `<br><span style="font-size:11px;color:#64748b">${escapeHtml(i.attributeLabel)}</span>` : ""}</td>
          <td>${escapeHtml(i.sku)}</td>
          <td>${i.qty}</td>
          <td>$${i.unitPrice.toFixed(2)}</td>
          <td>$${i.subtotal.toFixed(2)}</td>
        </tr>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibo - ${escapeHtml(data.companyName)}</title><style>
    body { font-family: system-ui, sans-serif; max-width: 320px; margin: 16px auto; padding: 12px; font-size: 14px; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 6px 4px; font-size: 11px; color: #64748b; }
    td { padding: 6px 4px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .total { font-weight: 700; font-size: 16px; margin-top: 12px; padding-top: 8px; border-top: 2px solid #0f172a; }
    .change { margin-top: 8px; color: #059669; }
    @media print { body { margin: 0; } }
  </style></head><body>
    <h1>${escapeHtml(data.companyName)}</h1>
    <p class="meta">${escapeHtml(data.branchName)} · ${escapeHtml(data.date)}</p>
    <table><thead><tr><th>Producto</th><th>SKU</th><th>Cant.</th><th>P.unit.</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="total">Total: $${data.total.toFixed(2)} · ${escapeHtml(data.paymentLabel)}</p>
    ${data.paid != null && data.change != null && data.change > 0 ? `<p class="change">Pagado: $${data.paid.toFixed(2)} · Vuelto: $${data.change.toFixed(2)}</p>` : ""}
    <p class="meta" style="margin-top: 24px;">— GIRO —</p>
  </body></html>`;
}

export function openReceiptPrint(data: ReceiptPrintData) {
  const html = buildReceiptHtml(data);
  const w = window.open("", "_blank", "noopener");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    w.onload = () => setTimeout(() => w.print(), 250);
  }
}

export function downloadReceiptHtml(data: ReceiptPrintData) {
  const html = buildReceiptHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `recibo-${data.date.replace(/[/:]/g, "-").replace(/, /g, "_")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playTone(523, 0, 0.08);
    playTone(659, 0.1, 0.12);
  } catch {
    // ignore if AudioContext not supported or blocked
  }
}
