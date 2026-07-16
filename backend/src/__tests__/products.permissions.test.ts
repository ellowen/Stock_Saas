import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { prisma } from "../config/database/prisma";

/**
 * Test de integracion real (DB de dev, sin mocks): confirma que
 * requirePermission("PRODUCTS_WRITE"/"PRODUCTS_DELETE") en products.router.ts
 * efectivamente bloquea a un usuario sin ese permiso, y que un usuario con
 * permiso pasa. No depende de datos seed — crea su propia empresa/usuarios
 * temporales y los borra al final.
 */
describe("Products router — permisos", () => {
  let app: ReturnType<typeof createApp>;
  let companyId: number;
  let sellerToken: string;
  let ownerToken: string;
  const createdProductIds: number[] = [];

  beforeAll(async () => {
    app = createApp();

    const company = await prisma.company.create({ data: { name: "PermTest Co" } });
    companyId = company.id;
    const passwordHash = await bcrypt.hash("test-password-123", 10);

    await prisma.user.create({
      data: {
        companyId,
        username: "permtest-seller",
        password: passwordHash,
        fullName: "Perm Test Seller",
        role: "SELLER",
      },
    });
    await prisma.user.create({
      data: {
        companyId,
        username: "permtest-owner",
        password: passwordHash,
        fullName: "Perm Test Owner",
        role: "OWNER",
      },
    });

    const sellerLogin = await request(app)
      .post("/auth/login")
      .send({ username: "permtest-seller", password: "test-password-123" });
    sellerToken = sellerLogin.body.accessToken;

    const ownerLogin = await request(app)
      .post("/auth/login")
      .send({ username: "permtest-owner", password: "test-password-123" });
    ownerToken = ownerLogin.body.accessToken;
  });

  afterAll(async () => {
    for (const id of createdProductIds) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      await prisma.product.deleteMany({ where: { id } });
    }
    await prisma.auditLog.deleteMany({ where: { companyId } }); // login escribe AuditLog(action: LOGIN)
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it("SELLER (sin PRODUCTS_WRITE) recibe 403 en POST /products", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ name: "No deberia crearse", variants: [{ sku: "PERM-1", price: 10 }] });
    expect(res.status).toBe(403);
  });

  it("SELLER (sin PRODUCTS_WRITE) recibe 403 en PATCH /products/:id", async () => {
    const res = await request(app)
      .patch("/products/999999")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ name: "x" });
    expect(res.status).toBe(403);
  });

  it("SELLER (sin PRODUCTS_DELETE) recibe 403 en DELETE /products/:id", async () => {
    const res = await request(app)
      .delete("/products/999999")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it("OWNER (con PRODUCTS_WRITE) puede crear un producto (201)", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Producto de test de permisos", variants: [{ sku: "PERM-OWNER-1", price: 10 }] });
    expect(res.status).toBe(201);
    createdProductIds.push(res.body.id);
  });
});
