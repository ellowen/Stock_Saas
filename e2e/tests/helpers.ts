import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API = "http://localhost:4000";
export const PASSWORD = "Demo1234";

// Usernames are globally unique, so every run gets its own suffix.
export const RUN = Date.now().toString(36);

export async function uiLogin(page: Page, username: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByPlaceholder("Tu usuario").fill(username);
  await page.getByPlaceholder("Tu contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

export async function apiToken(request: APIRequestContext, username: string, password = PASSWORD) {
  const res = await request.post(`${API}/auth/login`, { data: { username, password } });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
