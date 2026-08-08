import { test, expect } from "@playwright/test";

test.describe("Leave request approval gate", () => {
  test("submit as a linked employee, appears in Approvals, admin approves it", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("sara.sales@erp.local");
    await page.locator('input[name="password"]').fill("sales12345");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/my/leave");
    const reason = `Playwright test ${Date.now()}`;
    await page.locator('input[name="startDate"]').fill("2026-09-01");
    await page.locator('input[name="endDate"]').fill("2026-09-02");
    await page.locator('input[name="reason"]').fill(reason);
    await page.getByRole("button", { name: "Submit Request" }).click();

    // The requester's own history table shows the approver's note, not the submitted reason —
    // so match on the newest row (listMyLeaveRequests sorts newest-first) instead.
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toContainText("2026-09-01 to 2026-09-02");
    await expect(firstRow).toContainText("pending");

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.locator('input[name="email"]').fill("admin@erp.local");
    await page.locator('input[name="password"]').fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Admin is multi-company; a fresh session has no activeCompanyId cookie yet, so make the
    // active company explicit (a real browser session would already have this set from prior
    // navigation) rather than relying on the fallback's arbitrary "first company" tie-break.
    const companySwitcher = page.locator('select[name="companyId"]');
    if (await companySwitcher.count()) {
      await companySwitcher.selectOption({ label: "MSAA Event Management Agency" });
      await page.waitForLoadState("networkidle");
    }

    await page.goto("/approvals");
    const card = page.locator("div.rounded-lg.border.border-stone-200.p-3", { hasText: reason });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Approve" }).click();

    await expect(page.locator("text=" + reason)).toHaveCount(0);
  });
});
