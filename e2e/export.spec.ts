import { test, expect, type Page } from "@playwright/test";

async function exportFromMenu(page: Page, name: string) {
    await page.getByRole("button", { name: "More download options" }).click();
    await page.getByRole("menuitem", { name }).click();
}

test("exports JSON and Typst files from the download menu", async ({
    page,
}) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();

    const jsonDownload = page.waitForEvent("download");
    await exportFromMenu(page, "Export .json");
    await expect((await jsonDownload).suggestedFilename()).toMatch(/\.json$/);

    const typstDownload = page.waitForEvent("download");
    await exportFromMenu(page, "Export .typ");
    await expect((await typstDownload).suggestedFilename()).toMatch(/\.typ$/);
});

test("shows an error when a template asset fails to load", async ({ page }) => {
    await page.route("**/typst/jake.typ", (route) =>
        route.fulfill({ status: 404, body: "missing" }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await exportFromMenu(page, "Export .typ");
    await expect(page.getByRole("alert")).toContainText("failed to load");
});
