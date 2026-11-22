import { test, expect, type Page } from "@playwright/test";
import { openCardMenu } from "./fixtures/card-menu";

async function saveResume(page: Page, filename: string) {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await page.getByLabel("Resume filename").fill(filename);
}

async function openLibrary(page: Page) {
    await page.getByRole("link", { name: "Resume Library" }).click();
    await expect(page).toHaveURL(/\/library$/);
}

test.describe("library", () => {
    test("lists a saved resume with preview and last edited @smoke", async ({
        page,
    }) => {
        await saveResume(page, "lib-listed");
        await openLibrary(page);

        const card = page
            .getByTestId("library-card")
            .filter({ hasText: "lib-listed" });
        await expect(card).toBeVisible();
        await expect(card).toContainText("Local");
        await expect(card).toContainText(/Last edited (just now|\d+ minute)/);
        // Rendering is lazy; either state is a valid card.
        await expect(
            card
                .getByTestId("library-thumbnail")
                .or(card.getByTestId("library-thumbnail-placeholder")),
        ).toBeVisible();
        await expect(card.getByTestId("library-thumbnail")).toBeVisible({
            timeout: 60_000,
        });

        await page.reload();
        await expect(
            page.getByTestId("library-card").filter({ hasText: "lib-listed" }),
        ).toBeVisible();
    });

    test("opens a resume from its card", async ({ page }) => {
        await saveResume(page, "lib-open");
        await openLibrary(page);
        await page.getByRole("button", { name: "Open lib-open" }).click();
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).toHaveValue(
            "lib-open",
        );
    });

    test("shows an empty state with a new resume action", async ({ page }) => {
        await page.goto("/library");
        await expect(page.getByTestId("library-empty")).toBeVisible();
        await page
            .getByTestId("library-empty")
            .getByRole("button", { name: "New resume" })
            .click();
        await expect(page).toHaveURL(/\/editor$/);
    });

    test("imports a JSON file and opens it", async ({ page }) => {
        await page.goto("/library");
        await page
            .locator('input[type="file"]')
            .setInputFiles("e2e/fixtures/message-1.json");
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).toHaveValue("Resume1");
        await openLibrary(page);
        await expect(
            page.getByTestId("library-card").filter({ hasText: "Resume1" }),
        ).toBeVisible();
    });

    test("rejects an invalid import", async ({ page }) => {
        await page.goto("/library");
        await page.locator('input[type="file"]').setInputFiles({
            name: "bad.json",
            mimeType: "application/json",
            buffer: Buffer.from("{nope"),
        });
        await expect(page.getByRole("alert")).toContainText("not valid JSON");
        await expect(page).toHaveURL(/\/library$/);
    });

    test("downloads a resume and the whole library", async ({ page }) => {
        await saveResume(page, "lib-download");
        await openLibrary(page);

        const menu = page.getByRole("menu", { name: "lib-download actions" });
        for (const [item, file] of [
            ["Download JSON", "lib-download.json"],
            ["Download Typst", "lib-download.typ"],
            ["Download PDF", "lib-download.pdf"],
        ]) {
            const download = page.waitForEvent("download", { timeout: 60000 });
            await openCardMenu(
                page,
                page.getByRole("button", { name: "Actions for lib-download" }),
            );
            await menu.getByRole("menuitem", { name: item }).click();
            expect((await download).suggestedFilename()).toBe(file);
        }

        const all = page.waitForEvent("download");
        await page.getByRole("button", { name: "Download all" }).click();
        expect((await all).suggestedFilename()).toBe("commitcv-library.json");
    });

    test("deletes a resume only after confirming", async ({ page }) => {
        await saveResume(page, "lib-delete");
        await openLibrary(page);
        const card = page
            .getByTestId("library-card")
            .filter({ hasText: "lib-delete" });

        const menu = page.getByRole("menu", { name: "lib-delete actions" });
        await openCardMenu(
            page,
            card.getByRole("button", { name: "Actions for lib-delete" }),
        );
        await menu.getByRole("menuitem", { name: "Delete" }).click();
        await card.getByRole("button", { name: "Cancel" }).click();
        await expect(card).toBeVisible();

        // A right-click opens the same menu.
        await card.click({ button: "right" });
        await menu.getByRole("menuitem", { name: "Delete" }).click();
        await card
            .getByRole("button", { name: "Confirm delete lib-delete" })
            .click();
        await expect(card).toHaveCount(0);
    });

    test("remembers a dismissed backup warning", async ({ page }) => {
        await page.goto("/library");
        const banner = page.getByRole("region", { name: "Backup warning" });
        await expect(banner).toContainText("only in this browser");
        await banner.getByRole("button", { name: "Dismiss" }).click();
        await expect(banner).toHaveCount(0);
        await page.reload();
        await expect(banner).toHaveCount(0);
    });

    test("reflects and requests storage persistence", async ({ page }) => {
        await page.addInitScript(() => {
            let persisted = false;
            Object.defineProperty(navigator, "storage", {
                configurable: true,
                value: {
                    persisted: async () => persisted,
                    persist: async () => (persisted = true),
                    estimate: async () => ({
                        usage: 2 * 1024 * 1024,
                        quota: 1024 * 1024 * 1024,
                    }),
                },
            });
        });
        await page.goto("/library");
        const status = page.getByTestId("persistence-status");
        await expect(status).toContainText("Not protected");
        await expect(status).toContainText("2.0 MB of 1.0 GB");
        await status.getByRole("button", { name: "Protect storage" }).click();
        await expect(status).toContainText("Protected from automatic cleanup");
    });
});
