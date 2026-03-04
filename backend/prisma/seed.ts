import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, CompanyPlan, PaymentMethod } from "@prisma/client";

const prisma = new PrismaClient();

const TALLES = ["XS", "S", "M", "L", "XL"];
const COLORES = ["Negro", "Blanco", "Gris", "Azul", "Rojo", "Verde", "Beige", "Navy"];

const PRODUCTOS_ROPA: { name: string; category: string; brand: string }[] = [
  { name: "Remera básica algodón", category: "Remeras", brand: "Básico" },
  { name: "Remera manga larga", category: "Remeras", brand: "Básico" },
  { name: "Pantalón jean slim", category: "Pantalones", brand: "Denim" },
  { name: "Pantalón jean recto", category: "Pantalones", brand: "Denim" },
  { name: "Short jean", category: "Shorts", brand: "Denim" },
  { name: "Short deportivo", category: "Shorts", brand: "Sport" },
  { name: "Campera liviana", category: "Camperas", brand: "Outdoor" },
  { name: "Campera canguro", category: "Camperas", brand: "Urban" },
  { name: "Buzo con capucha", category: "Buzos", brand: "Urban" },
  { name: "Buzo sin capucha", category: "Buzos", brand: "Básico" },
  { name: "Vestido casual", category: "Vestidos", brand: "Fem" },
  { name: "Vestido verano", category: "Vestidos", brand: "Fem" },
  { name: "Pollera tableada", category: "Polleras", brand: "Fem" },
  { name: "Pollera jean", category: "Polleras", brand: "Denim" },
  { name: "Camisa Oxford", category: "Camisas", brand: "Clásico" },
  { name: "Camisa lisa", category: "Camisas", brand: "Básico" },
  { name: "Musculosa", category: "Remeras", brand: "Básico" },
  { name: "Calza deportiva", category: "Pantalones", brand: "Sport" },
  { name: "Jogging", category: "Pantalones", brand: "Sport" },
  { name: "Sweater lana", category: "Buzos", brand: "Invierno" },
  { name: "Cardigan", category: "Buzos", brand: "Clásico" },
  { name: "Remera polo", category: "Remeras", brand: "Clásico" },
  { name: "Chomba", category: "Remeras", brand: "Sport" },
  { name: "Campera rompeviento", category: "Camperas", brand: "Outdoor" },
  { name: "Campera invierno", category: "Camperas", brand: "Invierno" },
  { name: "Pantalón cargo", category: "Pantalones", brand: "Urban" },
  { name: "Pantalón chino", category: "Pantalones", brand: "Clásico" },
  { name: "Short bermuda", category: "Shorts", brand: "Urban" },
  { name: "Top crop", category: "Remeras", brand: "Fem" },
  { name: "Body básico", category: "Remeras", brand: "Fem" },
  { name: "Blusa manga corta", category: "Camisas", brand: "Fem" },
  { name: "Blusa manga larga", category: "Camisas", brand: "Fem" },
  { name: "Saco blazer", category: "Camperas", brand: "Clásico" },
  { name: "Tapado corto", category: "Camperas", brand: "Invierno" },
  { name: "Pantalón palazzo", category: "Pantalones", brand: "Fem" },
  { name: "Remera oversize", category: "Remeras", brand: "Urban" },
  { name: "Hoodie", category: "Buzos", brand: "Urban" },
  { name: "Medias pack x3", category: "Accesorios", brand: "Básico" },
  { name: "Boxer pack x2", category: "Ropa interior", brand: "Básico" },
  { name: "Bombacha pack x2", category: "Ropa interior", brand: "Básico" },
  { name: "Corpiño deportivo", category: "Ropa interior", brand: "Sport" },
  { name: "Pijama corto", category: "Pijamas", brand: "Hogar" },
  { name: "Pijama largo", category: "Pijamas", brand: "Hogar" },
  { name: "Babucha", category: "Pantalones", brand: "Hogar" },
  { name: "Remera térmica", category: "Remeras", brand: "Sport" },
  { name: "Calza running", category: "Pantalones", brand: "Sport" },
  { name: "Top deportivo", category: "Remeras", brand: "Sport" },
  { name: "Pantalón tiro alto", category: "Pantalones", brand: "Fem" },
  { name: "Enterito", category: "Vestidos", brand: "Fem" },
  { name: "Mono trabajo", category: "Pantalones", brand: "Work" },
];

function pick<T>(arr: T[], n: number): T[] {
  const out: T[] = [];
  const copy = [...arr];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return out;
}

async function clearCompanyProducts(companyId: number) {
  const transferIds = await prisma.stockTransfer.findMany({ where: { companyId }, select: { id: true } }).then((r) => r.map((t) => t.id));
  if (transferIds.length > 0) {
    await prisma.stockTransferItem.deleteMany({ where: { stockTransferId: { in: transferIds } } });
  }
  await prisma.stockTransfer.deleteMany({ where: { companyId } });
  await prisma.saleItem.deleteMany({ where: { companyId } });
  await prisma.sale.deleteMany({ where: { companyId } });
  await prisma.inventory.deleteMany({ where: { companyId } });
  await prisma.productVariant.deleteMany({ where: { companyId } });
  await prisma.product.deleteMany({ where: { companyId } });
}

async function seedDemoRopa(companyId: number, branches: { id: number }[], userId: number, replaceExisting: boolean) {
  const productCount = await prisma.product.count({ where: { companyId } });
  if (productCount > 0) {
    if (!replaceExisting) {
      // eslint-disable-next-line no-console
      console.log("Seed: la compañía ya tiene productos. No se agregan más.");
      return;
    }
    // eslint-disable-next-line no-console
    console.log("Seed: reemplazando productos existentes por catálogo solo ropa.");
    await clearCompanyProducts(companyId);
  }

  const branchIds = branches.map((b) => b.id);
  if (branchIds.length === 0) throw new Error("Se necesitan sucursales");

  const allVariants: { id: number; price: number }[] = [];
  let skuCounter = 1000;

  for (const prod of PRODUCTOS_ROPA) {
    const product = await prisma.product.create({
      data: {
        companyId,
        name: prod.name,
        category: prod.category,
        brand: prod.brand,
      },
    });

    const talles = pick(TALLES, 2 + Math.floor(Math.random() * 2));
    const colores = pick(COLORES, 2 + Math.floor(Math.random() * 3));
    for (const talle of talles) {
      for (const color of colores) {
        const sku = `ROP-${skuCounter++}`;
        const price = 15 + Math.floor(Math.random() * 120);
        const variant = await prisma.productVariant.create({
          data: {
            companyId,
            productId: product.id,
            size: talle,
            color,
            sku,
            barcode: `789${String(skuCounter).padStart(9, "0")}`,
            price,
          },
        });
        allVariants.push({ id: variant.id, price });

        for (const branchId of branchIds) {
          const qty = 5 + Math.floor(Math.random() * 45);
          const minStock = Math.random() > 0.6 ? 5 : null;
          await prisma.inventory.create({
            data: {
              companyId,
              branchId,
              productVariantId: variant.id,
              quantity: qty,
              minStock,
            },
          });
        }
      }
    }
  }

  // Ventas en los últimos 14 días
  const now = new Date();
  const salesToCreate: { branchId: number; userId: number; date: Date; items: { variantId: number; qty: number; unitPrice: number }[] }[] = [];

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const salesThisDay = 2 + Math.floor(Math.random() * 5);
    for (let s = 0; s < salesThisDay; s++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
      const branchId = branchIds[Math.floor(Math.random() * branchIds.length)]!;
      const numItems = 1 + Math.floor(Math.random() * 3);
      const chosen = pick(allVariants, numItems);
      const items = chosen.map((v) => ({
        variantId: v.id,
        qty: 1 + Math.floor(Math.random() * 2),
        unitPrice: v.price,
      }));
      salesToCreate.push({ branchId, userId, date, items });
    }
  }

  for (const sale of salesToCreate) {
    const totalAmount = sale.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
    const totalItems = sale.items.reduce((sum, i) => sum + i.qty, 0);
    const created = await prisma.sale.create({
      data: {
        companyId,
        branchId: sale.branchId,
        userId: sale.userId,
        totalAmount,
        totalItems,
        paymentMethod: ["CASH", "CARD", "MIXED"][Math.floor(Math.random() * 3)] as PaymentMethod,
        status: "COMPLETED",
        createdAt: sale.date,
      },
    });
    for (const item of sale.items) {
      await prisma.saleItem.create({
        data: {
          saleId: created.id,
          companyId,
          productVariantId: item.variantId,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.qty,
        },
      });
      const inv = await prisma.inventory.findFirst({
        where: {
          companyId,
          branchId: sale.branchId,
          productVariantId: item.variantId,
        },
      });
      if (inv && inv.quantity >= item.qty) {
        await prisma.inventory.update({
          where: { id: inv.id },
          data: { quantity: inv.quantity - item.qty },
        });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seed demo ropa: ${PRODUCTOS_ROPA.length} productos, variantes, stock en ${branchIds.length} sucursales, ${salesToCreate.length} ventas.`);
}

async function main() {
  const username = "owner";
  const passwordHash = await bcrypt.hash("password123", 10);

  const existingUser = await prisma.user.findFirst({
    where: { username },
    include: { company: true },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: passwordHash, email: "owner@example.com" },
    });
    const companyId = existingUser.companyId;
    let branches = await prisma.branch.findMany({ where: { companyId }, select: { id: true } });
    if (branches.length < 3) {
      const names = ["Sucursal Centro", "Sucursal Norte", "Sucursal Sur"];
      const codes = ["CENTRO", "NORTE", "SUR"];
      for (let i = branches.length; i < 3; i++) {
        await prisma.branch.create({
          data: { companyId, name: names[i]!, code: codes[i]! },
        });
      }
      branches = await prisma.branch.findMany({ where: { companyId }, select: { id: true } });
    }
    await seedDemoRopa(companyId, branches, existingUser.id, true);
    // eslint-disable-next-line no-console
    console.log("Seed: usuario owner actualizado. Demo solo ropa. Credenciales: usuario 'owner', password 'password123'");
    return;
  }

  const company = await prisma.company.create({
    data: {
      name: "Demo Ropa",
      legalName: "Demo Ropa SRL",
      plan: CompanyPlan.PRO,
    },
  });

  const branchNames = [
    { name: "Sucursal Centro", code: "CENTRO" },
    { name: "Sucursal Norte", code: "NORTE" },
    { name: "Sucursal Sur", code: "SUR" },
  ];
  for (const b of branchNames) {
    await prisma.branch.create({
      data: { companyId: company.id, name: b.name, code: b.code },
    });
  }
  const branches = await prisma.branch.findMany({ where: { companyId: company.id }, select: { id: true } });
  const branch1 = branches[0]!;

  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      branchId: branch1.id,
      username,
      email: "owner@example.com",
      password: passwordHash,
      fullName: "Demo Owner",
      role: UserRole.OWNER,
    },
  });

  await seedDemoRopa(company.id, branches, user.id, false);

  // eslint-disable-next-line no-console
  console.log("Seed completed. Compañía solo ropa. Credenciales: usuario 'owner', password 'password123'");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
