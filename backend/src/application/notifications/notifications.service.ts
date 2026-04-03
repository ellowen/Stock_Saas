import { prisma } from "../../config/database/prisma";
import { sendEmail } from "../../infrastructure/email/mailer";

export class NotificationsService {
  /**
   * Checks companies with low stock alerts enabled and sends email to OWNER.
   * Called after each sale and after bulk adjustments.
   */
  async checkAndNotifyLowStock(companyId: number) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        lowStockAlerts: true,
        users: {
          where: { role: "OWNER", isActive: true },
          select: { email: true, fullName: true },
          take: 1,
        },
      },
    });
    if (!company?.lowStockAlerts) return;

    const ownerEmail = company.users[0]?.email;
    if (!ownerEmail) return;

    // Find low stock items (using same logic as dashboard)
    const rows = await prisma.inventory.findMany({
      where: { companyId },
      select: {
        quantity: true,
        minStock: true,
        variant: {
          select: {
            sku: true,
            product: { select: { name: true } },
          },
        },
        branch: { select: { name: true, code: true } },
      },
    });

    const lowStock = rows.filter(
      (r) =>
        (r.minStock != null && r.quantity <= r.minStock) ||
        (r.minStock == null && r.quantity < 5)
    );
    if (lowStock.length === 0) return;

    const itemsHtml = lowStock
      .slice(0, 20)
      .map(
        (r) =>
          `<tr><td>${r.variant.product.name}</td><td>${r.variant.sku}</td><td>${r.branch.name}</td><td><strong>${r.quantity}</strong>${r.minStock != null ? ` / mín ${r.minStock}` : ""}</td></tr>`
      )
      .join("");

    const subject = `⚠️ ${lowStock.length} producto(s) con stock bajo — ${company.name}`;
    const html = `
      <h2>Alerta de stock bajo — ${company.name}</h2>
      <p>Los siguientes productos están por debajo del stock mínimo:</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <thead><tr><th>Producto</th><th>SKU</th><th>Sucursal</th><th>Stock</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      ${lowStock.length > 20 ? `<p>... y ${lowStock.length - 20} más.</p>` : ""}
      <p><a href="#">Ver inventario completo</a></p>
    `;

    await sendEmail({ to: ownerEmail, subject, html });
  }

  /**
   * Sends daily/weekly sales summary to all companies with the feature enabled.
   * @param period "DAILY" | "WEEKLY"
   */
  async sendSalesReport(period: "DAILY" | "WEEKLY") {
    const companies = await prisma.company.findMany({
      where: { salesReportFreq: period, isActive: true },
      select: {
        id: true,
        name: true,
        users: {
          where: { role: "OWNER", isActive: true },
          select: { email: true, fullName: true },
          take: 1,
        },
      },
    });

    const now = new Date();
    const from = new Date(now);
    if (period === "DAILY") {
      from.setDate(from.getDate() - 1);
    } else {
      from.setDate(from.getDate() - 7);
    }

    for (const company of companies) {
      const ownerEmail = company.users[0]?.email;
      if (!ownerEmail) continue;

      const sales = await prisma.sale.findMany({
        where: { companyId: company.id, createdAt: { gte: from, lte: now } },
        select: { totalAmount: true, totalItems: true, createdAt: true },
      });

      if (sales.length === 0) continue;

      const totalRevenue = sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);

      // Top products
      const saleItems = await prisma.saleItem.findMany({
        where: { companyId: company.id, sale: { createdAt: { gte: from, lte: now } } },
        select: {
          quantity: true,
          unitPrice: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      });

      const productTotals = new Map<string, { name: string; qty: number; revenue: number }>();
      for (const item of saleItems) {
        const key = item.variant.product.name;
        const cur = productTotals.get(key) ?? { name: key, qty: 0, revenue: 0 };
        cur.qty += Number(item.quantity);
        cur.revenue += Number(item.quantity) * Number(item.unitPrice);
        productTotals.set(key, cur);
      }

      const top5 = Array.from(productTotals.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const periodLabel = period === "DAILY" ? "ayer" : "los últimos 7 días";
      const subject = `📊 Resumen de ventas de ${periodLabel} — ${company.name}`;
      const html = `
        <h2>Resumen de ventas — ${company.name}</h2>
        <p>Período: <strong>${from.toLocaleDateString("es-AR")}</strong> al <strong>${now.toLocaleDateString("es-AR")}</strong></p>
        <ul>
          <li>Ventas: <strong>${sales.length}</strong></li>
          <li>Ingresos: <strong>$${totalRevenue.toFixed(2)}</strong></li>
        </ul>
        ${top5.length > 0 ? `
          <h3>Top 5 productos</h3>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
            <thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr></thead>
            <tbody>${top5.map((p) => `<tr><td>${p.name}</td><td>${p.qty}</td><td>$${p.revenue.toFixed(2)}</td></tr>`).join("")}</tbody>
          </table>
        ` : ""}
      `;

      await sendEmail({ to: ownerEmail, subject, html });
    }
  }
}
