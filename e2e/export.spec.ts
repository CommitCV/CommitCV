import { test, expect } from "@playwright/test";

test("exports JSON and Typst files", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();

    const jsonDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export .json" }).click();
    await expect((await jsonDownload).suggestedFilename()).toMatch(/\.json$/);

    const typstDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export .typ" }).click();
    await expect((await typstDownload).suggestedFilename()).toMatch(/\.typ$/);
});

test("shows an error when a template asset fails to load", async ({ page }) => {
    await page.route("**/typst/jake.typ", (route) =>
        route.fulfill({ status: 404, body: "missing" }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await page.getByRole("button", { name: "Export .typ" }).click();
    await expect(page.getByRole("alert")).toContainText("failed to load");
});
