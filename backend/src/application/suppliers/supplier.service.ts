import { prisma } from "../../config/database/prisma";

export class SupplierService {
  async list(companyId: number, search?: string) {
    return prisma.supplier.findMany({
      where: {
        companyId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { taxId: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async create(
    companyId: number,
    data: {
      name: string;
      taxId?: string;
      address?: string;
      city?: string;
      email?: string;
      phone?: string;
      notes?: string;
    }
  ) {
    return prisma.supplier.create({
      data: { companyId, ...data },
    });
  }

  async update(
    id: number,
    companyId: number,
    data: {
      name?: string;
      taxId?: string;
      address?: string;
      city?: string;
      email?: string;
      phone?: string;
      notes?: string;
    }
  ) {
    return prisma.supplier.update({
      where: { id, companyId },
      data,
    });
  }

  async delete(id: number, companyId: number) {
    await prisma.supplier.update({
      where: { id, companyId },
      data: { isActive: false },
    });
  }

  async getById(id: number, companyId: number) {
    return prisma.supplier.findFirst({
      where: { id, companyId, isActive: true },
    });
  }
}
