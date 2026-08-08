import { test, expect } from "@playwright/test";

test.describe("Supplier portal", () => {
  test("rejects a wrong password, then accepts the correct one and scopes data to that supplier", async ({
    page,
  }) => {
    await page.goto("/supplier/login");
    await page.locator('input[name="username"]').fill("riyadh-lighting");
    await page.locator('input[name="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid username or password.")).toBeVisible();

    await page.locator('input[name="username"]').fill("riyadh-lighting");
    await page.locator('input[name="password"]').fill("SupplierPass123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/supplier\/dashboard/);
    await expect(page.getByText("Riyadh Lighting & Sound Co.")).toBeVisible();
    // Must never show another supplier's purchase order.
    await expect(page.getByText("PO-00001")).toHaveCount(0);
  });
});
