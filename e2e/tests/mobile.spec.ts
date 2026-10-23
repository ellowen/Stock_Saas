import { expect, test } from "@playwright/test";
import { uiLogin } from "./helpers";

// Phone viewport (Pixel 7 project): navigation drawer and a full POS sale.
test("seller-style POS sale on a phone", async ({ page }) => {
  await uiLogin(page, "owner", "password123");

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.locator('a[href="/app/sales"]').first().click();
  await expect(page).toHaveURL(/\/app\/sales/);

  const search = page.getByLabel("Buscar producto").first();
  await search.fill("Remera");
  const firstResult = page.getByRole("listbox").getByRole("option").first();
  await firstResult.click();

  await page.getByRole("button", { name: /^Cobrar/ }).first().click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta registrada/i).first()).toBeVisible();

  // No horizontal scroll on the phone layout.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
