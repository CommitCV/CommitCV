import { test, expect } from "@playwright/test";

test("home, editor, and preview smoke flow @smoke", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CommitCV/i);
    await page.getByRole("button", { name: "Start editing" }).click();
    await expect(page.getByTestId("resume-preview")).toBeVisible();
});
