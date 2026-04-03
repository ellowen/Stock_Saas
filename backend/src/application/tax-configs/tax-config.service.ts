import { prisma } from "../../config/database/prisma";

export class TaxConfigService {
  async list(companyId: number) {
    return prisma.taxConfig.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async create(
    companyId: number,
    data: { name: string; rate: number; isDefault?: boolean }
  ) {
    if (data.isDefault) {
      await prisma.taxConfig.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }
    return prisma.taxConfig.create({
      data: { companyId, ...data },
    });
  }

  async update(
    id: number,
    companyId: number,
    data: { name?: string; rate?: number; isDefault?: boolean; isActive?: boolean }
  ) {
    if (data.isDefault) {
      await prisma.taxConfig.updateMany({
        where: { companyId },
        data: { isDefault: false },
      });
    }
    return prisma.taxConfig.update({
      where: { id, companyId },
      data,
    });
  }

  async delete(id: number, companyId: number) {
    await prisma.taxConfig.update({
      where: { id, companyId },
      data: { isActive: false },
    });
  }
}
