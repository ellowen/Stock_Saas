/**
 * Stock Forecast Service
 *
 * Analyzes 30-day sales velocity per product variant and computes:
 *  - Units sold in the last N days
 *  - Daily velocity (units/day)
 *  - Estimated days until stockout given current stock
 *  - Suggested reorder quantity to cover a target supply window (default 30 days)
 *  - Urgency tier: CRITICAL (<7d), WARNING (<14d), OK, DEAD (no sales in period)
 *
 * Also resolves the last known supplier for each variant via purchase orders.
 */

import { prisma } from "../../config/database/prisma";

export type Urgency = "CRITICAL" | "WARNING" | "OK" | "DEAD";

export interface ForecastRow {
  variantId: number;
  productId: number;
  productName: string;
  variantLabel: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  branchId: number;
  branchName: string;
  currentStock: number;
  minStock: number | null;
  sold30d: number;
  velocity: number;           // units / day
  daysToStockout: number | null; // null = no sales (dead stock or infinite)
  urgency: Urgency;
  suggestedQty: number;       // to cover targetDays of supply
  lastSupplierId: number | null;
  lastSupplierName: string | null;
}

const TARGET_DAYS = 30;

function urgencyOf(daysToStockout: number | null, sold30d: number): Urgency {
  if (sold30d === 0) return "DEAD";
  if (daysToStockout === null) return "OK";
  if (daysToStockout < 7) return "CRITICAL";
  if (daysToStockout < 14) return "WARNING";
  return "OK";
}

export class StockForecastService {
  async getReorderSuggestions(
    companyId: number,
    opts: { branchId?: number; urgency?: Urgency; days?: number } = {}
  ): Promise<ForecastRow[]> {
    const analysisDays = opts.days ?? 30;
    const since = new Date();
    since.setDate(since.getDate() - analysisDays);

    // 1. Load all inventory rows (with variant + product + branch)
    const inventoryRows = await prisma.inventory.findMany({
      where: {
        companyId,
        ...(opts.branchId ? { branchId: opts.branchId } : {}),
      },
      include: {
        variant: {
          include: {
            product: { select: { id: true, name: true, category: true, brand: true } },
            attributes: { include: { attribute: true } },
          },
        },
        branch: { select: { id: true, name: true } },
      },
    });

    if (inventoryRows.length === 0) return [];

    // 2. Aggregate sales per variant in the analysis window
    const salesAgg = await prisma.saleItem.groupBy({
      by: ["productVariantId"],
      where: {
        companyId,
        sale: {
          createdAt: { gte: since },
          status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
      },
      _sum: { quantity: true },
    });

    const soldMap = new Map<number, number>();
    for (const row of salesAgg) {
      soldMap.set(row.productVariantId, row._sum.quantity ?? 0);
    }

    // 3. Resolve last supplier per variant via purchase order items
    const lastPoItems = await prisma.purchaseOrderItem.findMany({
      where: {
        variantId: { in: inventoryRows.map((r) => r.productVariantId) },
        order: { companyId },
      },
      orderBy: { order: { date: "desc" } },
      distinct: ["variantId"],
      include: { order: { select: { supplierId: true, supplier: { select: { id: true, name: true } } } } },
    });

    const supplierMap = new Map<number, { id: number; name: string }>();
    for (const item of lastPoItems) {
      if (item.variantId && item.order.supplier) {
        supplierMap.set(item.variantId, { id: item.order.supplier.id, name: item.order.supplier.name });
      }
    }

    // 4. Build forecast rows
    const rows: ForecastRow[] = inventoryRows.map((inv) => {
      const sold30d = soldMap.get(inv.productVariantId) ?? 0;
      const velocity = sold30d / analysisDays;
      const currentStock = inv.quantity;

      let daysToStockout: number | null = null;
      if (velocity > 0) {
        daysToStockout = Math.floor(currentStock / velocity);
      }

      const urgency = urgencyOf(daysToStockout, sold30d);

      // Suggested qty: cover TARGET_DAYS from now
      const neededForTarget = Math.ceil(velocity * TARGET_DAYS);
      const suggestedQty = Math.max(0, neededForTarget - currentStock);

      // Build variant label from attributes or size/color
      const attrs = inv.variant.attributes ?? [];
      const variantLabel =
        attrs.length > 0
          ? attrs.map((a) => a.value).join(" / ")
          : [inv.variant.size, inv.variant.color].filter(Boolean).join(" / ") || inv.variant.sku || "";

      const supplier = supplierMap.get(inv.productVariantId) ?? null;

      return {
        variantId: inv.productVariantId,
        productId: inv.variant.product.id,
        productName: inv.variant.product.name,
        variantLabel,
        sku: inv.variant.sku,
        category: inv.variant.product.category,
        brand: inv.variant.product.brand,
        branchId: inv.branchId,
        branchName: inv.branch.name,
        currentStock,
        minStock: inv.minStock,
        sold30d,
        velocity: Math.round(velocity * 100) / 100,
        daysToStockout,
        urgency,
        suggestedQty,
        lastSupplierId: supplier?.id ?? null,
        lastSupplierName: supplier?.name ?? null,
      };
    });

    // Filter by urgency if requested
    const filtered =
      opts.urgency
        ? rows.filter((r) => r.urgency === opts.urgency)
        : rows;

    // Sort: CRITICAL first, then WARNING, then OK, then DEAD; within tier by daysToStockout asc
    const urgencyOrder: Record<Urgency, number> = { CRITICAL: 0, WARNING: 1, OK: 2, DEAD: 3 };
    return filtered.sort((a, b) => {
      const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (diff !== 0) return diff;
      const da = a.daysToStockout ?? 9999;
      const db = b.daysToStockout ?? 9999;
      return da - db;
    });
  }

  /**
   * Given a list of selected variant+branch+qty rows, create a draft purchase order
   * per supplier (or one ungrouped order if no supplier known).
   */
  async createSuggestedPurchaseOrders(
    companyId: number,
    userId: number,
    branchId: number,
    lines: Array<{ variantId: number; qty: number; supplierId: number | null; description: string; unitPrice: number }>
  ) {
    // Group by supplierId (null = unknown supplier group)
    const groups = new Map<number | null, typeof lines>();
    for (const line of lines) {
      const key = line.supplierId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(line);
    }

    const created: { orderId: number; supplierId: number | null; itemCount: number }[] = [];

    for (const [supplierId, groupLines] of groups) {
      // Get next order number
      const last = await prisma.purchaseOrder.findFirst({
        where: { companyId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;

      // Find a valid supplier — if null, use first active supplier
      let resolvedSupplierId = supplierId;
      if (!resolvedSupplierId) {
        const fallback = await prisma.supplier.findFirst({
          where: { companyId, isActive: true },
          select: { id: true },
        });
        if (!fallback) continue; // skip if no supplier exists
        resolvedSupplierId = fallback.id;
      }

      const total = groupLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

      const order = await prisma.purchaseOrder.create({
        data: {
          companyId,
          branchId,
          supplierId: resolvedSupplierId,
          userId,
          number,
          status: "DRAFT",
          total,
          items: {
            create: groupLines.map((l) => ({
              variantId: l.variantId,
              description: l.description,
              quantity: l.qty,
              unitPrice: l.unitPrice,
            })),
          },
        },
        select: { id: true },
      });

      created.push({ orderId: order.id, supplierId: resolvedSupplierId, itemCount: groupLines.length });
    }

    return created;
  }
}
