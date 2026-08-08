import { test, expect } from "@playwright/test";

test.describe("Staff login", () => {
  test("wrong password shows an error and stays on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("admin@erp.local");
    await page.locator('input[name="password"]').fill("wrong-password-xyz");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email/code or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("correct credentials reach the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("admin@erp.local");
    await page.locator('input[name="password"]').fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Company-wide overview across all modules")).toBeVisible();
  });
});
