import { test, expect, type Page } from "@playwright/test";
import { connect } from "./fixtures/fake-git";

const doc = (filename: string, text = filename) =>
    JSON.stringify(
        {
            filename,
            date: "01-01-26",
            schema_version: 1,
            sections: [
                {
                    title: "Experience",
                    type: "full-text",
                    toggled: true,
                    content: [{ text, flags: [], toggled: true }],
                    subsections: [],
                },
            ],
        },
        null,
        4,
    );

const seed = (page: Page, count: number) =>
    page.evaluate(
        ([n, content]) =>
            window.__fake.seedHistory(
                "remote.json",
                Array.from({ length: n as number }, (_, i) => ({
                    content: (content as string).replaceAll("@@", `v${i + 1}`),
                    message: `version ${i + 1}`,
                    minutesAgo: (n as number) - i,
                })),
            ),
        [count, doc("@@")] as const,
    );

async function openRemote(page: Page, versions = 3) {
    await connect(page);
    if (versions > 0) await seed(page, versions);
    await page.goto("/library");
    await page.getByRole("button", { name: "Open remote.json" }).click();
    await expect(page).toHaveURL(/\/editor$/);
}

const panel = (page: Page) => page.getByTestId("history-panel");
const openHistory = async (page: Page) => {
    await page.getByRole("button", { name: "History" }).click();
    await expect(panel(page)).toBeVisible();
};

test.describe("history", () => {
    test("lists squashed versions newest first, without session commits", async ({
        page,
    }) => {
        await openRemote(page);
        await page.getByLabel("Resume filename").fill("draft");
        await page.getByRole("button", { name: "Commit Changes" }).click();
        await expect(page.getByRole("status")).toHaveText("Saved");
        await openHistory(page);
        const entries = panel(page).getByTestId("history-entry");
        await expect(entries).toHaveCount(4);
        await expect(entries.nth(1)).toContainText("version 3");
        await expect(entries.nth(1)).toContainText("by Ada");
        await expect(entries.nth(3)).toContainText("version 1");
    });

    test("selecting a version shows a preview and what restoring changes", async ({
        page,
    }) => {
        await openRemote(page);
        await openHistory(page);
        await panel(page).getByTestId("history-entry").nth(2).click();
        await expect(panel(page).getByTestId("history-summary")).toContainText(
            "experience",
        );
        // The first typst render is slow when the suite runs in parallel.
        await expect(panel(page).getByTestId("preview-page-1")).toBeVisible({
            timeout: 20_000,
        });
    });

    test("restore replaces the document as an unsaved edit that undo reverts", async ({
        page,
    }) => {
        await openRemote(page);
        await expect(page.getByLabel("Resume filename")).toHaveValue("v3");
        await openHistory(page);
        await panel(page).getByTestId("history-entry").nth(2).click();
        await panel(page)
            .getByRole("button", { name: "Restore this version" })
            .click();
        await expect(panel(page)).toBeHidden();
        await expect(page.getByLabel("Resume filename")).toHaveValue("v1");
        await expect(page.getByRole("status")).toHaveText("Unsaved changes");
        await page.keyboard.press("ControlOrMeta+z");
        await expect(page.getByLabel("Resume filename")).toHaveValue("v3");
    });

    test("asks before replacing uncommitted changes", async ({ page }) => {
        await openRemote(page);
        await page.getByLabel("Resume filename").fill("mine");
        await openHistory(page);
        await panel(page).getByTestId("history-entry").nth(1).click();
        await panel(page)
            .getByRole("button", { name: "Restore this version" })
            .click();
        await expect(panel(page).getByRole("alert")).toContainText(
            "unsaved changes that will be replaced",
        );
        await panel(page).getByRole("button", { name: "Cancel" }).click();
        await expect(page.getByLabel("Resume filename")).toHaveValue("mine");
        await panel(page)
            .getByRole("button", { name: "Restore this version" })
            .click();
        await panel(page)
            .getByRole("button", { name: "Replace my changes" })
            .click();
        await expect(page.getByLabel("Resume filename")).toHaveValue("v2");
    });

    test("Escape closes the panel and returns focus to History", async ({
        page,
    }) => {
        await openRemote(page);
        await openHistory(page);
        await page.keyboard.press("Escape");
        await expect(panel(page)).toBeHidden();
        await expect(
            page.getByRole("button", { name: "History" }),
        ).toBeFocused();
    });

    test("Load older pages back through shallow history", async ({ page }) => {
        await openRemote(page, 25);
        await openHistory(page);
        const entries = panel(page).getByTestId("history-entry");
        await expect(entries).toHaveCount(20);
        await panel(page).getByRole("button", { name: "Load older" }).click();
        await expect(entries).toHaveCount(25);
        await expect(entries.last()).toContainText("version 1");
        await expect(
            panel(page).getByRole("button", { name: "Load older" }),
        ).toHaveCount(0);
    });

    test("shows an empty state for a file with no versions", async ({
        page,
    }) => {
        await openRemote(page, 0);
        await openHistory(page);
        await expect(panel(page)).toContainText("No saved versions yet");
    });

    test("local resumes have no History button", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: "Start editing" }).click();
        await expect(page.getByLabel("Resume filename")).toBeVisible();
        await expect(page.getByRole("button", { name: "History" })).toHaveCount(
            0,
        );
    });
});
