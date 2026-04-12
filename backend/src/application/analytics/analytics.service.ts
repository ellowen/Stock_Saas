import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

export class AnalyticsService {
  async overview(
    companyId: number,
    options?: { from?: string; to?: string }
  ) {
    const saleWhere: Prisma.SaleWhereInput = { companyId };
    if (options?.from && options?.to) {
      saleWhere.createdAt = {
        gte: startOfDay(options.from),
        lte: endOfDay(options.to),
      };
    }

    const [salesAgg, productsCount, variantsCount, inventoryAgg] =
      await Promise.all([
        prisma.sale.aggregate({
          where: saleWhere,
          _sum: {
            totalAmount: true,
            totalItems: true,
          },
          _count: true,
        }),
        prisma.product.count({ where: { companyId } }),
        prisma.productVariant.count({ where: { companyId } }),
        prisma.inventory.aggregate({
          where: { companyId },
          _sum: {
            quantity: true,
          },
        }),
      ]);

    return {
      totalSales: salesAgg._count,
      totalRevenue: salesAgg._sum.totalAmount ?? 0,
      totalItemsSold: salesAgg._sum.totalItems ?? 0,
      productsCount,
      variantsCount,
      totalStockUnits: inventoryAgg._sum.quantity ?? 0,
    };
  }

  async topProducts(
    companyId: number,
    limit = 10,
    options?: { from?: string; to?: string }
  ) {
    const saleItemWhere: Prisma.SaleItemWhereInput = { companyId };
    if (options?.from && options?.to) {
      saleItemWhere.sale = {
        createdAt: {
          gte: startOfDay(options.from),
          lte: endOfDay(options.to),
        },
      };
    }

    const items = await prisma.saleItem.groupBy({
      by: ["productVariantId"],
      where: saleItemWhere,
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          totalPrice: "desc",
        },
      },
      take: limit,
    });

    const variantIds = items.map((i) => i.productVariantId);

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: true,
        attributes: { include: { attribute: true }, orderBy: { attribute: { sortOrder: "asc" } } },
      },
    });

    const variantById = new Map(variants.map((v) => [v.id, v]));

    return items.map((item) => {
      const variant = variantById.get(item.productVariantId);
      return {
        productVariantId: item.productVariantId,
        quantitySold: item._sum.quantity ?? 0,
        revenue: item._sum.totalPrice ?? 0,
        sku: variant?.sku,
        price: variant?.price,
        attributes: (variant?.attributes ?? []).map((va) => ({ name: va.attribute.name, value: va.value })),
        product: variant?.product
          ? {
            id: variant.product.id,
            name: variant.product.name,
            category: variant.product.category,
            brand: variant.product.brand,
          }
          : null,
      };
    });
  }

  async dashboard(companyId: number) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const fromStr = sevenDaysAgo.toISOString().slice(0, 10);

    // Week boundaries for trend comparison
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const [
      overviewToday,
      overviewYesterday,
      fullOverview,
      branchesCount,
      lowStockCount,
      salesLast7,
      recentSales,
      payrollStats,
    ] = await Promise.all([
      this.overview(companyId, { from: todayStr, to: todayStr }),
      this.overview(companyId, { from: yesterdayStr, to: yesterdayStr }),
      this.overview(companyId),
      prisma.branch.count({ where: { companyId, isActive: true } }),
      (async () => {
        const rows = await prisma.inventory.findMany({
          where: { companyId },
          select: { quantity: true, minStock: true },
        });
        return rows.filter(
          (r) =>
            (r.minStock != null && r.quantity <= r.minStock) ||
            (r.minStock == null && r.quantity < 5)
        ).length;
      })(),
      prisma.sale.findMany({
        where: {
          companyId,
          createdAt: { gte: startOfDay(fromStr), lte: endOfDay(todayStr) },
        },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.sale.findMany({
        where: { companyId, status: { notIn: ["CANCELLED"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          totalAmount: true,
          totalItems: true,
          paymentMethod: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      (async () => {
        const [confirmed, periodRows] = await Promise.all([
          prisma.payroll.count({ where: { companyId, status: "CONFIRMED" } }),
          prisma.payroll.findMany({
            where: { companyId, period: currentPeriod },
            select: { netSalary: true, status: true },
          }),
        ]);
        const totalNet = periodRows.reduce((s, r) => s + Number(r.netSalary), 0);
        const paidNet = periodRows.filter((r) => r.status === "PAID").reduce((s, r) => s + Number(r.netSalary), 0);
        return { pendingConfirmed: confirmed, periodCount: periodRows.length, totalNetThisMonth: totalNet, paidNetThisMonth: paidNet };
      })(),
    ]);

    const byDay = new Map<string, { totalAmount: number; count: number }>();
    for (let d = 0; d < 7; d++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + d);
      const key = date.toISOString().slice(0, 10);
      byDay.set(key, { totalAmount: 0, count: 0 });
    }
    for (const s of salesLast7) {
      const key = (s.createdAt as Date).toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { totalAmount: 0, count: 0 };
      cur.count += 1;
      cur.totalAmount += Number(s.totalAmount);
      byDay.set(key, cur);
    }
    const salesByDay = Array.from(byDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Trend helpers: pct change (null if no base)
    const pct = (curr: number, prev: number) =>
      prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

    return {
      salesToday: overviewToday.totalSales,
      revenueToday: overviewToday.totalRevenue,
      salesYesterday: overviewYesterday.totalSales,
      revenueYesterday: overviewYesterday.totalRevenue,
      salesTrend: pct(overviewToday.totalSales, overviewYesterday.totalSales),
      revenueTrend: pct(Number(overviewToday.totalRevenue), Number(overviewYesterday.totalRevenue)),
      totalStockUnits: fullOverview.totalStockUnits,
      branchesCount,
      lowStockAlerts: lowStockCount,
      salesByDayLast7: salesByDay,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        totalAmount: Number(s.totalAmount),
        totalItems: s.totalItems,
        paymentMethod: s.paymentMethod,
        createdAt: s.createdAt,
        customerName: s.customer?.name ?? null,
      })),
      payroll: payrollStats,
    };
  }

  async salesByDay(
    companyId: number,
    days = 30,
    options?: { from?: string; to?: string }
  ) {
    let gte: Date;
    let lte: Date;
    if (options?.from && options?.to) {
      gte = startOfDay(options.from);
      lte = endOfDay(options.to);
    } else {
      lte = new Date();
      gte = new Date();
      gte.setDate(gte.getDate() - days);
    }

    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        createdAt: { gte, lte },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return sales;
  }

  async reportDetail(
    companyId: number,
    from: string,
    to: string
  ) {
    const gte = startOfDay(from);
    const lte = endOfDay(to);
    const saleWhere: Prisma.SaleWhereInput = {
      companyId,
      createdAt: { gte, lte },
    };

    const [salesAgg, salesForPayment, topItems, salesList, salesByCategory] = await Promise.all([
      prisma.sale.aggregate({
        where: saleWhere,
        _sum: { totalAmount: true, totalItems: true },
        _count: true,
      }),
      prisma.sale.findMany({
        where: saleWhere,
        select: {
          paymentMethod: true,
          totalAmount: true,
          paymentCashAmount: true,
          paymentCardAmount: true,
        },
      }),
      (async () => {
        const items = await prisma.saleItem.groupBy({
          by: ["productVariantId"],
          where: {
            companyId,
            sale: { createdAt: { gte, lte } },
          },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { totalPrice: "desc" } },
          take: 20,
        });
        const variantIds = items.map((i) => i.productVariantId);
        const variants = await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: true,
            attributes: { include: { attribute: true }, orderBy: { attribute: { sortOrder: "asc" } } },
          },
        });
        const variantById = new Map(variants.map((v) => [v.id, v]));
        return items.map((item) => {
          const v = variantById.get(item.productVariantId);
          const attrList = (v?.attributes ?? []).map((va) => ({ name: va.attribute.name, value: va.value }));
          const variantLabel = attrList.length > 0 ? attrList.map((a) => a.value).join(" / ") : (v?.sku ?? "");
          return {
            productVariantId: item.productVariantId,
            quantitySold: item._sum.quantity ?? 0,
            revenue: item._sum.totalPrice ?? 0,
            sku: v?.sku ?? "",
            variantLabel,
            attributes: attrList,
            product: v?.product
              ? { id: v.product.id, name: v.product.name, category: v.product.category, brand: v.product.brand }
              : null,
          };
        });
      })(),
      prisma.sale.findMany({
        where: saleWhere,
        select: { createdAt: true, totalAmount: true },
        orderBy: { createdAt: "asc" },
      }),
      (async () => {
        const items = await prisma.saleItem.findMany({
          where: { sale: saleWhere },
          select: { totalPrice: true, quantity: true, variant: { select: { product: { select: { category: true } } } } },
        });
        const byCategory = new Map<string, { revenue: number; quantitySold: number }>();
        for (const item of items) {
          const cat = item.variant?.product?.category ?? "Sin categoría";
          const cur = byCategory.get(cat) ?? { revenue: 0, quantitySold: 0 };
          cur.revenue += Number(item.totalPrice);
          cur.quantitySold += item.quantity;
          byCategory.set(cat, cur);
        }
        return Array.from(byCategory.entries())
          .map(([category, data]) => ({ category, revenue: data.revenue, quantitySold: data.quantitySold }))
          .sort((a, b) => b.revenue - a.revenue);
      })(),
    ]);

    const byDay = new Map<string, { totalAmount: number; count: number }>();
    for (const s of salesList) {
      const day = (s.createdAt as Date).toISOString().slice(0, 10);
      const current = byDay.get(day) ?? { totalAmount: 0, count: 0 };
      current.count += 1;
      current.totalAmount += Number(s.totalAmount);
      byDay.set(day, current);
    }
    const salesByDay = Array.from(byDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Split MIXED into Efectivo (CASH) and Tarjeta (CARD) for report
    const paymentMap = new Map<string, { count: number; totalAmount: number }>();
    for (const s of salesForPayment) {
      const method = s.paymentMethod;
      const total = Number(s.totalAmount);
      const cashAmt = s.paymentCashAmount != null ? Number(s.paymentCashAmount) : 0;
      const cardAmt = s.paymentCardAmount != null ? Number(s.paymentCardAmount) : 0;
      if (method === "MIXED") {
        if (cashAmt > 0) {
          const c = paymentMap.get("CASH") ?? { count: 0, totalAmount: 0 };
          c.count += 1;
          c.totalAmount += cashAmt;
          paymentMap.set("CASH", c);
        }
        if (cardAmt > 0) {
          const c = paymentMap.get("CARD") ?? { count: 0, totalAmount: 0 };
          c.count += 1;
          c.totalAmount += cardAmt;
          paymentMap.set("CARD", c);
        }
      } else {
        const key = method;
        const c = paymentMap.get(key) ?? { count: 0, totalAmount: 0 };
        c.count += 1;
        c.totalAmount += total;
        paymentMap.set(key, c);
      }
    }
    const byPaymentMethod = Array.from(paymentMap.entries())
      .map(([paymentMethod, data]) => ({ paymentMethod, ...data }))
      .filter((row) => row.totalAmount > 0 || row.count > 0);

    return {
      summary: {
        totalSales: salesAgg._count,
        totalRevenue: salesAgg._sum.totalAmount ?? 0,
        totalItemsSold: salesAgg._sum.totalItems ?? 0,
      },
      byPaymentMethod,
      topProducts: topItems,
      salesByDay,
      salesByCategory,
    };
  }

  /**
   * Productos (variantes en inventario) sin movimiento en los últimos X días.
   * Por cada ítem en inventario se considera el último movimiento en esa sucursal;
   * si no hubo movimiento en los últimos `days` días, se incluye en el reporte.
   */
  async productsWithoutMovement(
    companyId: number,
    days: number,
    options?: { branchId?: number }
  ) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const inventoryWhere: Prisma.InventoryWhereInput = { companyId };
    if (options?.branchId != null) {
      inventoryWhere.branchId = options.branchId;
    }

    const [inventoryRows, lastMovements] = await Promise.all([
      prisma.inventory.findMany({
        where: inventoryWhere,
        include: {
          variant: {
            include: {
              product: true,
              attributes: { include: { attribute: true }, orderBy: { attribute: { sortOrder: "asc" } } },
            },
          },
          branch: true,
        },
      }),
      prisma.inventoryMovement.groupBy({
        by: ["branchId", "productVariantId"],
        where: { companyId },
        _max: { createdAt: true },
      }),
    ]);

    const lastByKey = new Map<string, Date>();
    for (const g of lastMovements) {
      const key = `${g.branchId}:${g.productVariantId}`;
      const lastAt = g._max.createdAt;
      if (lastAt) lastByKey.set(key, lastAt);
    }

    const result: {
      productVariantId: number;
      productName: string;
      variantLabel: string;
      sku: string;
      branchId: number;
      branchName: string;
      quantity: number;
      lastMovementAt: string | null;
    }[] = [];

    for (const row of inventoryRows) {
      const key = `${row.branchId}:${row.productVariantId}`;
      const lastAt = lastByKey.get(key);
      if (lastAt != null && lastAt >= since) continue; // tuvo movimiento en los últimos X días
      result.push({
        productVariantId: row.productVariantId,
        productName: row.variant.product.name,
        variantLabel: row.variant.attributes.length > 0
          ? row.variant.attributes.map((a) => a.value).join(" / ")
          : row.variant.sku,
        sku: row.variant.sku,
        branchId: row.branchId,
        branchName: row.branch.name,
        quantity: row.quantity,
        lastMovementAt: lastAt ? lastAt.toISOString() : null,
      });
    }

    // Ordenar por sucursal y luego producto
    result.sort((a, b) => {
      if (a.branchName !== b.branchName) return a.branchName.localeCompare(b.branchName);
      return a.productName.localeCompare(b.productName) || a.sku.localeCompare(b.sku);
    });

    return result;
  }
}

