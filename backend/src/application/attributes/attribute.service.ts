import { prisma } from "../../config/database/prisma";
import { INDUSTRY_PROFILES } from "./industry-profiles";

export interface CreateAttributeInput {
  name: string;
  type: "TEXT" | "NUMBER" | "SELECT";
  options?: string[];
  sortOrder?: number;
}

export class AttributeService {
  async list(companyId: number) {
    return prisma.attribute.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async create(companyId: number, data: CreateAttributeInput) {
    const existing = await prisma.attribute.findUnique({
      where: { companyId_name: { companyId, name: data.name.trim() } },
    });
    if (existing) {
      throw new Error(`Ya existe un atributo con el nombre "${data.name}"`);
    }

    return prisma.attribute.create({
      data: {
        companyId,
        name: data.name.trim(),
        type: data.type,
        options: data.options?.length ? JSON.stringify(data.options) : null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    companyId: number,
    data: Partial<CreateAttributeInput>
  ) {
    const attr = await prisma.attribute.findFirst({ where: { id, companyId } });
    if (!attr) return null;

    if (data.name && data.name.trim() !== attr.name) {
      const conflict = await prisma.attribute.findUnique({
        where: { companyId_name: { companyId, name: data.name.trim() } },
      });
      if (conflict) {
        throw new Error(`Ya existe un atributo con el nombre "${data.name}"`);
      }
    }

    return prisma.attribute.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.options !== undefined && {
          options: data.options.length ? JSON.stringify(data.options) : null,
        }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async delete(id: number, companyId: number): Promise<boolean> {
    const attr = await prisma.attribute.findFirst({ where: { id, companyId } });
    if (!attr) return false;

    const inUse = await prisma.productVariantAttribute.count({
      where: { attributeId: id },
    });
    if (inUse > 0) {
      throw new Error(
        `No se puede eliminar: el atributo "${attr.name}" está en uso en ${inUse} variante(s)`
      );
    }

    await prisma.attribute.delete({ where: { id } });
    return true;
  }

  async applyIndustryProfile(
    companyId: number,
    profileKey: string
  ): Promise<{ created: number; skipped: number }> {
    const profile = INDUSTRY_PROFILES[profileKey.toUpperCase()];
    if (!profile) {
      throw new Error(`Perfil de industria "${profileKey}" no existe`);
    }

    let created = 0;
    let skipped = 0;

    for (const attr of profile.attributes) {
      const existing = await prisma.attribute.findUnique({
        where: { companyId_name: { companyId, name: attr.name } },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.attribute.create({
        data: {
          companyId,
          name: attr.name,
          type: attr.type,
          options: attr.options?.length ? JSON.stringify(attr.options) : null,
          sortOrder: attr.sortOrder,
        },
      });
      created++;
    }

    // Actualizar industryType de la empresa
    await prisma.company.update({
      where: { id: companyId },
      data: { industryType: profileKey.toUpperCase() },
    });

    return { created, skipped };
  }

  getProfiles() {
    return Object.entries(INDUSTRY_PROFILES).map(([key, profile]) => ({
      key,
      label: profile.label,
      attributeCount: profile.attributes.length,
    }));
  }
}
