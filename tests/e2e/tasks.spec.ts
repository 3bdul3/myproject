import { test, expect } from "@playwright/test";

test.describe("Personal tasks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("admin@erp.local");
    await page.locator('input[name="password"]').fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("create, toggle done, and delete a task", async ({ page }) => {
    await page.goto("/my/tasks");

    const title = `Playwright test task ${Date.now()}`;
    await page.locator('input[name="title"]').fill(title);
    await page.getByRole("button", { name: "Add Task" }).click();

    const row = page.locator("tr", { hasText: title });
    await expect(row).toBeVisible();

    await row.locator('button[aria-label="Mark done"]').click();
    await expect(row.locator("td").nth(1)).toHaveClass(/line-through/);

    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("tr", { hasText: title })).toHaveCount(0);
  });
});
