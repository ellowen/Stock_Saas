import { parse } from "csv-parse/sync";
import { prisma } from "../../config/database/prisma";
import { InventoryMovementType } from "@prisma/client";

export interface CsvImportResult {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
}

interface CsvRow {
  name: string;
  sku: string;
  barcode?: string;
  price?: string;
  costPrice?: string;
  attributes?: string; // "Talle:S,Color:Blanco"
  stock?: string;
  branchCode?: string;
  category?: string;
  brand?: string;
}

export class CsvImportService {
  async importProducts(
    companyId: number,
    userId: number,
    fileBuffer: Buffer
  ): Promise<CsvImportResult> {
    let records: CsvRow[];
    try {
      records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as CsvRow[];
    } catch {
      throw new Error("INVALID_CSV");
    }

    if (records.length === 0) throw new Error("EMPTY_CSV");

    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; message: string }> = [];

    // Pre-load branches by code for this company
    const branches = await prisma.branch.findMany({
      where: { companyId },
      select: { id: true, code: true },
    });
    const branchByCode = new Map(branches.map((b) => [b.code.toUpperCase(), b.id]));

    // Pre-load attributes by name for this company
    const existingAttrs = await prisma.attribute.findMany({
      where: { companyId },
      select: { id: true, name: true },
    });
    const attrByName = new Map(existingAttrs.map((a) => [a.name.toLowerCase(), a.id]));

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2; // 1-based + header
      const row = records[i];

      try {
        if (!row.name?.trim()) throw new Error("name is required");
        if (!row.sku?.trim()) throw new Error("sku is required");

        const priceNum = row.price ? parseFloat(row.price) : 0;
        if (row.price && isNaN(priceNum)) throw new Error(`invalid price: ${row.price}`);

        // Find or create Product
        let product = await prisma.product.findFirst({
          where: { companyId, name: row.name.trim(), isActive: true },
        });
        if (!product) {
          product = await prisma.product.create({
            data: {
              companyId,
              name: row.name.trim(),
              category: row.category?.trim() || undefined,
              brand: row.brand?.trim() || undefined,
            },
          });
        }

        // Parse attributes: "Talle:S,Color:Blanco"
        const attrPairs: Array<{ attributeId: number; value: string }> = [];
        if (row.attributes?.trim()) {
          const parts = row.attributes.split(",");
          for (const part of parts) {
            const [attrName, ...valueParts] = part.split(":");
            const value = valueParts.join(":").trim();
            const name = attrName.trim();
            if (!name || !value) continue;

            let attrId = attrByName.get(name.toLowerCase());
            if (!attrId) {
              const newAttr = await prisma.attribute.create({
                data: { companyId, name },
              });
              attrId = newAttr.id;
              attrByName.set(name.toLowerCase(), attrId);
            }
            attrPairs.push({ attributeId: attrId, value });
          }
        }

        // Find or create ProductVariant by SKU
        const existingVariant = await prisma.productVariant.findUnique({
          where: { companyId_sku: { companyId, sku: row.sku.trim() } },
        });

        let variantId: number;
        if (existingVariant) {
          // Update price / costPrice if provided
          await prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              ...(row.price && { price: priceNum }),
              ...(row.costPrice && { costPrice: parseFloat(row.costPrice) }),
              ...(row.barcode?.trim() && { barcode: row.barcode.trim() }),
            },
          });
          variantId = existingVariant.id;
          updated++;
        } else {
          const newVariant = await prisma.productVariant.create({
            data: {
              companyId,
              productId: product.id,
              sku: row.sku.trim(),
              barcode: row.barcode?.trim() || undefined,
              price: priceNum,
              costPrice: row.costPrice ? parseFloat(row.costPrice) : undefined,
            },
          });
          variantId = newVariant.id;
          created++;
        }

        // Sync attributes
        if (attrPairs.length > 0) {
          // Delete old attribute values for this variant and re-create
          await prisma.productVariantAttribute.deleteMany({
            where: { variantId },
          });
          await prisma.productVariantAttribute.createMany({
            data: attrPairs.map((a) => ({
              variantId,
              attributeId: a.attributeId,
              value: a.value,
            })),
          });
        }

        // Handle stock
        if (row.stock !== undefined && row.stock !== "") {
          const qty = parseInt(row.stock, 10);
          if (isNaN(qty) || qty < 0) throw new Error(`invalid stock: ${row.stock}`);

          const branchCode = row.branchCode?.trim().toUpperCase();
          if (!branchCode) throw new Error("branchCode is required when stock is specified");

          const branchId = branchByCode.get(branchCode);
          if (!branchId) throw new Error(`branch not found: ${row.branchCode}`);

          const existing = await prisma.inventory.findUnique({
            where: {
              companyId_branchId_productVariantId: { companyId, branchId, productVariantId: variantId },
            },
          });
          const before = existing?.quantity ?? 0;

          if (!existing) {
            await prisma.inventory.create({
              data: { companyId, branchId, productVariantId: variantId, quantity: qty },
            });
          } else {
            await prisma.inventory.update({
              where: { id: existing.id },
              data: { quantity: qty },
            });
          }

          await prisma.inventoryMovement.create({
            data: {
              companyId,
              branchId,
              productVariantId: variantId,
              type: InventoryMovementType.SET_QUANTITY,
              quantityBefore: before,
              quantityAfter: qty,
              userId,
              referenceType: "CSV_IMPORT",
            },
          });
        }
      } catch (e) {
        errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    return { created, updated, errors };
  }
}
