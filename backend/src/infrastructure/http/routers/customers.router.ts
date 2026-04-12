import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { CustomerService } from "../../../application/customers/customer.service";
import { prisma } from "../../../config/database/prisma";

const router = Router();
const service = new CustomerService();

router.use(authMiddleware);

router.get("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const search = req.query["search"] as string | undefined;
  const customers = await service.list(companyId, search);
  res.json(customers);
});

router.post("/", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const { name, taxId, taxType, address, city, email, phone, notes } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "El nombre es requerido" });
  }
  try {
    const customer = await service.create(companyId, { name, taxId, taxType, address, city, email, phone, notes });
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    const customer = await service.update(id, companyId, req.body);
    res.json(customer);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /customers/:id/sales — purchase history for a customer
router.get("/:id/sales", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

  const sales = await prisma.sale.findMany({
    where: { companyId, customerId: id, status: { notIn: ["CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, totalAmount: true, totalItems: true, paymentMethod: true,
      status: true, createdAt: true,
      items: {
        select: {
          quantity: true, unitPrice: true, totalPrice: true,
          variant: { select: { sku: true, size: true, color: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  const totalSpent = sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
  return res.json({ totalSpent, count: sales.length, sales });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const companyId = req.auth!.companyId;
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
  try {
    await service.delete(id, companyId);
    res.json({ message: "Cliente desactivado" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export const customersRouter = router;
