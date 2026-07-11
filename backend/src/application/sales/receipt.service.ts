import { sendEmail } from "../../infrastructure/email/mailer";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  MIXED: "Mixto",
  OTHER: "Otro",
  CREDIT: "Cuenta corriente",
};

type SaleForReceipt = {
  id: number;
  createdAt: Date;
  totalAmount: unknown;
  paymentMethod: string;
  branch: { name: string };
  items: Array<{
    quantity: number;
    unitPrice: unknown;
    discount: unknown;
    totalPrice: unknown;
    variant: { sku: string; product: { name: string } };
  }>;
};

function fmt(n: unknown): string {
  return Number(n).toFixed(2);
}

export function buildReceiptHtml(sale: SaleForReceipt, companyName: string): string {
  const rows = sale.items
    .map(
      (i) => `<tr>
        <td>${i.variant.product.name}</td>
        <td>${i.variant.sku}</td>
        <td>${i.quantity}</td>
        <td>$${fmt(i.unitPrice)}</td>
        <td>$${fmt(i.totalPrice)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: system-ui, sans-serif; max-width: 420px; margin: 16px auto; font-size: 14px; color: #1e293b; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 6px 4px; font-size: 11px; color: #64748b; }
    td { padding: 6px 4px; border-bottom: 1px solid #f1f5f9; }
    .total { font-weight: 700; font-size: 16px; margin-top: 12px; padding-top: 8px; border-top: 2px solid #0f172a; }
  </style></head><body>
    <h1>${companyName}</h1>
    <p class="meta">${sale.branch.name} · ${sale.createdAt.toLocaleString("es-AR")}</p>
    <table><thead><tr><th>Producto</th><th>SKU</th><th>Cant.</th><th>P.unit.</th><th>Subtotal</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="total">Total: $${fmt(sale.totalAmount)} · ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</p>
    <p class="meta" style="margin-top:24px;">— ${companyName} · GIRO —</p>
  </body></html>`;
}

export async function sendReceiptEmail(sale: SaleForReceipt, companyName: string, toEmail: string): Promise<void> {
  const html = buildReceiptHtml(sale, companyName);
  await sendEmail({
    to: toEmail,
    subject: `Recibo de compra - ${companyName}`,
    html,
  });
}
