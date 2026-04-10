import { prisma } from "../../config/database/prisma";
import { EmployeeStatus, ContractType } from "@prisma/client";

interface CreateEmployeeInput {
  branchId?: number;
  firstName: string;
  lastName: string;
  cuil?: string;
  email?: string;
  phone?: string;
  address?: string;
  position?: string;
  category?: string;
  hireDate: Date;
  contractType?: ContractType;
  grossSalary: number;
  bankAccount?: string;
  cbu?: string;
  notes?: string;
}

interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  status?: EmployeeStatus;
  terminationDate?: Date;
}

export class EmployeeService {
  async list(companyId: number, includeInactive = false) {
    return prisma.employee.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { status: { not: "INACTIVE" } }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { payrolls: true } },
      },
      orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    });
  }

  async getById(id: number, companyId: number) {
    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        branch: { select: { id: true, name: true } },
        payrolls: {
          orderBy: { period: "desc" },
          take: 12,
          select: {
            id: true,
            period: true,
            periodType: true,
            grossTotal: true,
            netSalary: true,
            status: true,
            paidAt: true,
          },
        },
      },
    });
    if (!employee) throw new Error("Empleado no encontrado");
    return employee;
  }

  async create(companyId: number, data: CreateEmployeeInput) {
    return prisma.employee.create({
      data: {
        companyId,
        ...data,
        grossSalary: data.grossSalary,
      },
    });
  }

  async update(id: number, companyId: number, data: UpdateEmployeeInput) {
    const employee = await prisma.employee.findFirst({ where: { id, companyId } });
    if (!employee) throw new Error("Empleado no encontrado");
    return prisma.employee.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: number, companyId: number, terminationDate?: Date) {
    const employee = await prisma.employee.findFirst({ where: { id, companyId } });
    if (!employee) throw new Error("Empleado no encontrado");
    return prisma.employee.update({
      where: { id },
      data: {
        status: "INACTIVE",
        terminationDate: terminationDate ?? new Date(),
      },
    });
  }
}
