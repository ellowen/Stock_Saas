import { expect, test } from "@playwright/test";
import { API, PASSWORD, RUN, apiToken, bearer, uiLogin } from "./helpers";

// End-to-end business flow for one company: owner signs up, sets up users and
// products, a seller sells from the POS, and the numbers line up afterwards.
test.describe.configure({ mode: "serial" });

const company = `Boutique Lucia ${RUN}`;
const owner = { fullName: "Lucia Owner", username: `owner_${RUN}` };
const manager = { fullName: "Martin Encargado", username: `manager_${RUN}` };
const seller = { fullName: "Sofia Vendedora", username: `seller_${RUN}` };
const product = { name: `Remera Oversize ${RUN}`, skuM: `REM-${RUN}-M`, skuL: `REM-${RUN}-L`, price: "15000" };

test("owner registers a new company", async ({ page }) => {
  await page.goto("/register");
  await page.getByPlaceholder("Ej. Mi Tienda SRL").fill(company);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByPlaceholder("Ej. Juan Pérez").fill(owner.fullName);
  await page.getByPlaceholder("Ej. jperez").fill(owner.username);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText(company)).toBeVisible();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/login\?registered=1/);
});

test("duplicate username is rejected on register", async ({ request }) => {
  const res = await request.post(`${API}/auth/register`, {
    data: { companyName: "Otra", fullName: "X", username: owner.username, password: PASSWORD },
  });
  expect(res.status()).toBe(409);
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Tu usuario").fill(owner.username);
  await page.getByPlaceholder("Tu contraseña").fill("incorrecta");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/incorrectos/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("owner logs in and new company has a default branch", async ({ page }) => {
  await uiLogin(page, owner.username);
  await expect(page.getByText(company).first()).toBeVisible();
  await page.goto("/app/branches");
  await expect(page.getByRole("cell", { name: "Casa Central" })).toBeVisible();
});

test("owner creates a manager and a seller", async ({ page }) => {
  await uiLogin(page, owner.username);
  await page.goto("/app/users");

  for (const [u, role] of [
    [manager, "MANAGER"],
    [seller, "SELLER"],
  ] as const) {
    await page.getByRole("button", { name: /Nuevo usuario/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre completo").fill(u.fullName);
    await dialog.getByLabel("Usuario").fill(u.username);
    await dialog.getByLabel("Contraseña").fill(PASSWORD);
    await dialog.getByLabel("Rol").selectOption(role);
    if (role === "SELLER") await dialog.getByLabel("Sucursal").selectOption({ label: "Casa Central (CENTRAL)" });
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("cell", { name: u.username })).toBeVisible();
  }
});

test("manager cannot create or modify owners (privilege escalation)", async ({ request }) => {
  const token = await apiToken(request, manager.username);
  const create = await request.post(`${API}/users`, {
    headers: bearer(token),
    data: { fullName: "Falso Dueño", username: `fake_owner_${RUN}`, password: PASSWORD, role: "OWNER" },
  });
  expect(create.status()).toBe(403);

  const users: { id: number; username: string; role: string }[] = await (
    await request.get(`${API}/users`, { headers: bearer(token) })
  ).json();
  const ownerRow = users.find((u) => u.role === "OWNER")!;
  const me = users.find((u) => u.username === manager.username)!;

  const editOwner = await request.put(`${API}/users/${ownerRow.id}`, { headers: bearer(token), data: { password: "hackeado1" } });
  expect(editOwner.status()).toBe(403);
  const promoteSelf = await request.put(`${API}/users/${me.id}`, { headers: bearer(token), data: { role: "OWNER" } });
  expect(promoteSelf.status()).toBe(403);
  const deleteOwner = await request.delete(`${API}/users/${ownerRow.id}`, { headers: bearer(token) });
  expect(deleteOwner.status()).toBe(403);
});

test("owner creates a product with two variants", async ({ page }) => {
  await uiLogin(page, owner.username);
  await page.goto("/app/inventory");
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del producto").fill(product.name);

  await dialog.getByLabel("Talle").first().fill("M");
  await dialog.getByLabel("Color").first().fill("Negro");
  await dialog.getByLabel("SKU").first().fill(product.skuM);
  await dialog.getByLabel("Precio venta").first().fill(product.price);

  await dialog.getByRole("button", { name: /Agregar variante/i }).click();
  await dialog.getByLabel("Talle").nth(1).fill("L");
  await dialog.getByLabel("Color").nth(1).fill("Blanco");
  await dialog.getByLabel("SKU").nth(1).fill(product.skuL);
  await dialog.getByLabel("Precio venta").nth(1).fill(product.price);

  await dialog.getByRole("button", { name: "Crear producto" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("cell", { name: product.name })).toBeVisible();
});

test("owner loads initial stock from the stock tab", async ({ page }) => {
  await uiLogin(page, owner.username);
  await page.goto("/app/inventory");
  await page.getByRole("button", { name: "Stock por sucursal" }).click();
  // New variants start at 0, which the tab hides by default.
  await page.getByLabel(/Ocultar sin stock/i).uncheck();

  for (const sku of [product.skuM, product.skuL]) {
    const row = page.getByRole("row").filter({ hasText: sku });
    await row.getByRole("button", { name: "Editar" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Cantidad").fill("10");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog).toBeHidden();
    await expect(row.getByRole("cell", { name: "10", exact: true })).toBeVisible();
  }
});

test("seller cannot manage users (API and UI)", async ({ page, request }) => {
  const token = await apiToken(request, seller.username);
  const res = await request.get(`${API}/users`, { headers: bearer(token) });
  expect(res.status()).toBe(403);

  await uiLogin(page, seller.username);
  await expect(page.locator('a[href="/app/users"]')).toHaveCount(0);
});

test("seller sells one unit from the POS", async ({ page }) => {
  await uiLogin(page, seller.username);
  await page.goto("/app/sales");
  const search = page.getByLabel("Buscar producto").first();
  await search.fill(product.skuM);
  await search.press("Enter");
  await expect(page.getByText(product.name).first()).toBeVisible();

  await page.getByRole("button", { name: /^Cobrar/ }).click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta registrada/i).first()).toBeVisible();
});

test("stock decreased and sale is visible to the manager", async ({ page, request }) => {
  const token = await apiToken(request, manager.username);
  const inv = await request.get(`${API}/inventory?search=${encodeURIComponent(product.name)}`, { headers: bearer(token) });
  expect(inv.ok()).toBeTruthy();
  const body = await inv.json();
  const rows: { quantity: number; variant: { sku: string } }[] = Array.isArray(body) ? body : body.data;
  expect(rows.find((r) => r.variant.sku === product.skuM)?.quantity).toBe(9);
  expect(rows.find((r) => r.variant.sku === product.skuL)?.quantity).toBe(10);

  await uiLogin(page, manager.username);
  await page.goto("/app/sales");
  await page.getByRole("button", { name: /Historial/i }).click();
  await expect(page.getByText(seller.fullName).first()).toBeVisible();
});

test("another company cannot see this company's data", async ({ request }) => {
  const other = `intruso_${RUN}`;
  const reg = await request.post(`${API}/auth/register`, {
    data: { companyName: `Otra Tienda ${RUN}`, fullName: "Intruso", username: other, password: PASSWORD },
  });
  expect(reg.status()).toBe(201);
  const token = await apiToken(request, other);

  const products = await request.get(`${API}/products`, { headers: bearer(token) });
  expect(await products.text()).not.toContain(product.skuM);
  const users = await request.get(`${API}/users`, { headers: bearer(token) });
  expect(await users.text()).not.toContain(seller.username);
  const inv = await request.get(`${API}/inventory`, { headers: bearer(token) });
  expect(await inv.text()).not.toContain(product.skuM);
});

test("logout returns to login and protects /app", async ({ page }) => {
  await uiLogin(page, owner.username);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).not.toHaveURL(/\/app\//);
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
