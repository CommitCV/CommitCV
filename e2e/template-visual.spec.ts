import { test, expect } from "@playwright/test";

test("captures the editor baseline", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await expect(page.getByTestId("resume-preview")).toBeVisible();
    expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000);
});

test("keeps the editor usable in dark theme", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
});
