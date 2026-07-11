import { PromotionScope, PromotionType } from "@prisma/client";
import { prisma } from "../../config/database/prisma";

export interface CreatePromotionInput {
  name: string;
  type: PromotionType;
  scope: PromotionScope;
  productId?: number | null;
  category?: string | null;
  percentOff?: number | null;
  buyQty?: number | null;
  freeQty?: number | null;
  couponCode?: string | null;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

type CartLine = { productVariantId: number; quantity: number; unitPrice: number };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class PromotionService {
  async list(companyId: number) {
    return prisma.promotion.findMany({
      where: { companyId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(companyId: number, input: CreatePromotionInput) {
    return prisma.promotion.create({
      data: {
        companyId,
        name: input.name,
        type: input.type,
        scope: input.scope,
        productId: input.productId ?? undefined,
        category: input.category ?? undefined,
        percentOff: input.percentOff ?? undefined,
        buyQty: input.buyQty ?? undefined,
        freeQty: input.freeQty ?? undefined,
        couponCode: input.couponCode?.trim().toUpperCase() || undefined,
        isActive: input.isActive ?? true,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      },
    });
  }

  async update(id: number, companyId: number, input: Partial<CreatePromotionInput>) {
    const existing = await prisma.promotion.findFirst({ where: { id, companyId } });
    if (!existing) throw new Error("PROMOTION_NOT_FOUND");
    return prisma.promotion.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.scope !== undefined && { scope: input.scope }),
        ...(input.productId !== undefined && { productId: input.productId ?? null }),
        ...(input.category !== undefined && { category: input.category ?? null }),
        ...(input.percentOff !== undefined && { percentOff: input.percentOff ?? null }),
        ...(input.buyQty !== undefined && { buyQty: input.buyQty ?? null }),
        ...(input.freeQty !== undefined && { freeQty: input.freeQty ?? null }),
        ...(input.couponCode !== undefined && { couponCode: input.couponCode?.trim().toUpperCase() || null }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.startsAt !== undefined && { startsAt: input.startsAt ? new Date(input.startsAt) : null }),
        ...(input.endsAt !== undefined && { endsAt: input.endsAt ? new Date(input.endsAt) : null }),
      },
    });
  }

  async delete(id: number, companyId: number) {
    const existing = await prisma.promotion.findFirst({ where: { id, companyId } });
    if (!existing) throw new Error("PROMOTION_NOT_FOUND");
    await prisma.promotion.delete({ where: { id } });
  }

  /** Promos activas dentro de rango de fechas, sin cupon (se aplican solas). */
  private async activeAutoPromotions(companyId: number) {
    const now = new Date();
    return prisma.promotion.findMany({
      where: {
        companyId,
        isActive: true,
        couponCode: null,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
    });
  }

  /**
   * Calcula el descuento automatico por linea (PERCENT_OFF / BUY_X_GET_Y_FREE)
   * segun las promos activas. Devuelve descuento por unidad, listo para sumar
   * al descuento manual ya existente en SaleItem.discount.
   * Server-authoritative: nunca confia en nada que mande el cliente.
   */
  async computeAutoDiscounts(
    companyId: number,
    lines: CartLine[]
  ): Promise<Map<number, number>> {
    const discountByVariant = new Map<number, number>();
    if (lines.length === 0) return discountByVariant;

    const promos = await this.activeAutoPromotions(companyId);
    if (promos.length === 0) return discountByVariant;

    const variantIds = lines.map((l) => l.productVariantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, productId: true, product: { select: { category: true } } },
    });
    const variantInfo = new Map(variants.map((v) => [v.id, v]));

    for (const line of lines) {
      const info = variantInfo.get(line.productVariantId);
      if (!info) continue;

      const applicable = promos.filter((p) => {
        if (p.scope === "PRODUCT") return p.productId === info.productId;
        if (p.scope === "CATEGORY") return p.category != null && p.category === info.product.category;
        return true; // ALL
      });
      if (applicable.length === 0) continue;

      let perUnitDiscount = 0;
      for (const p of applicable) {
        if (p.type === "PERCENT_OFF" && p.percentOff) {
          perUnitDiscount += line.unitPrice * p.percentOff;
        } else if (p.type === "BUY_X_GET_Y_FREE" && p.buyQty && p.freeQty) {
          const groupSize = p.buyQty + p.freeQty;
          const freeUnits = Math.floor(line.quantity / groupSize) * p.freeQty;
          if (freeUnits > 0) {
            // Convertido a "descuento por unidad" sobre toda la linea para
            // que encaje en SaleItem.discount (que es $ por unidad, no total).
            perUnitDiscount += (freeUnits * line.unitPrice) / line.quantity;
          }
        }
      }
      if (perUnitDiscount > 0) {
        discountByVariant.set(line.productVariantId, round2(Math.min(perUnitDiscount, line.unitPrice)));
      }
    }

    return discountByVariant;
  }

  /** Valida un cupon y devuelve el descuento total (sobre el subtotal de la venta). */
  async applyCoupon(companyId: number, code: string, subtotal: number): Promise<number> {
    const now = new Date();
    const promo = await prisma.promotion.findFirst({
      where: {
        companyId,
        couponCode: code.trim().toUpperCase(),
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      },
    });
    if (!promo) throw new Error("INVALID_COUPON");
    if (promo.endsAt && promo.endsAt < now) throw new Error("EXPIRED_COUPON");

    if (promo.type === "PERCENT_OFF" && promo.percentOff) {
      return round2(subtotal * promo.percentOff);
    }
    return 0;
  }
}
