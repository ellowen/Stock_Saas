import { expect, test } from "@playwright/test";
import { uiLogin } from "./helpers";

// Every module opens with the seeded demo company (npm run seed in backend)
// without JS errors or 5xx responses.
const ROUTES = [
  "dashboard", "inventory", "promotions", "sales", "transfers", "documents", "customers",
  "suppliers", "purchases", "accounts", "employees", "payroll", "accounting", "reports",
  "branches", "users", "plan", "audit", "settings",
];

test.describe("module smoke test (seed owner)", () => {
  for (const route of ROUTES) {
    test(`/app/${route} loads cleanly`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error" && !/favicon|push|service worker/i.test(m.text())) errors.push(`console: ${m.text()}`);
      });
      page.on("response", (r) => {
        if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
      });

      await uiLogin(page, "owner", "password123");
      await page.goto(`/app/${route}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("main")).not.toBeEmpty();
      await expect(page.getByText(/Algo salió mal|Something went wrong/i)).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
});

test("seed roles: seller and manager see the right menu", async ({ page }) => {
  await uiLogin(page, "vendedor", "password123");
  await expect(page.locator('aside a[href="/app/sales"]')).toBeVisible();
  await expect(page.locator('a[href="/app/users"]')).toHaveCount(0);
  await expect(page.locator('a[href="/app/accounting"]')).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await uiLogin(page, "encargado", "password123");
  await expect(page.locator('aside a[href="/app/reports"]')).toBeVisible();
  await expect(page.locator('a[href="/app/audit"]')).toHaveCount(0);
});

test("manager sees accounting, payroll and employees read-only", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 400 && r.url().includes(":4000") || r.status() === 403) errors.push(`${r.status()} ${r.url()}`); });

  await uiLogin(page, "encargado", "password123");
  await page.goto("/app/accounting");
  await page.getByRole("button", { name: /Libro diario/i }).click();
  await expect(page.getByRole("button", { name: "Nuevo asiento" })).toHaveCount(0);
  await page.goto("/app/payroll");
  await expect(page.getByText("Liquidaciones").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Nueva liquidación/ })).toHaveCount(0);
  await page.goto("/app/employees");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: /Nuevo empleado/i })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("seller sales history has no void/return actions", async ({ page }) => {
  await uiLogin(page, "vendedor", "password123");
  await page.goto("/app/sales");
  await page.getByRole("button", { name: /Historial/i }).click();
  await expect(page.getByRole("row").nth(1)).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Anular|Devolver)$/ })).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await uiLogin(page, "owner", "password123");
  await page.goto("/app/sales");
  await page.getByRole("button", { name: /Historial/i }).click();
  await expect(page.getByRole("button", { name: "Anular" }).first()).toBeVisible();
});
