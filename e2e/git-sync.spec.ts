import { test, expect, type Page } from "@playwright/test";
import { connect } from "./fixtures/fake-git";

// Timers run on Playwright's fake clock, so the 30s debounce and 60s push
// floor are crossed with `runFor` instead of real waiting.
async function openRemote(page: Page) {
    await page.clock.install();
    await connect(page);
    await page.getByTestId("connection").getByRole("button").first().click();
    await page.getByRole("button", { name: "Open remote.json" }).click();
    await expect(page).toHaveURL(/\/editor$/);
}

const rename = (page: Page, name: string) =>
    page.getByLabel("Resume filename").fill(name);
const fake = <T>(page: Page, pick: string) =>
    page.evaluate(
        (key) => (window.__fake as unknown as Record<string, T>)[key],
        pick,
    );
const status = (page: Page) => page.getByRole("status");

test.describe("git session sync", () => {
    test("autosaves to a session branch after the debounce", async ({
        page,
    }) => {
        await openRemote(page);
        await rename(page, "renamed");
        await expect(status(page)).toHaveText("Unsaved changes");
        await page.clock.runFor(20_000);
        expect(await fake(page, "sessionCommits")).toEqual([]);
        await page.clock.runFor(11_000);
        await expect(status(page)).toHaveText(/^Autosaved \d+s ago$/);
        const commits = await fake<{ branch: string; message: string }[]>(
            page,
            "sessionCommits",
        );
        expect(commits).toHaveLength(1);
        expect(commits[0].branch).toMatch(/^commitcv\/remote-[0-9a-f]{8}$/);
        expect(commits[0].message).toBe("update renamed");
        expect(await fake(page, "commits")).toEqual([]);
    });

    test("never pushes more than once a minute", async ({ page }) => {
        await openRemote(page);
        await rename(page, "one");
        await page.clock.runFor(31_000);
        await expect(status(page)).toContainText("Autosaved");
        await rename(page, "two");
        await page.clock.runFor(31_000);
        expect(await fake<unknown[]>(page, "sessionCommits")).toHaveLength(1);
        await page.clock.runFor(30_000);
        await expect(status(page)).toContainText("Autosaved");
        expect(await fake<unknown[]>(page, "sessionCommits")).toHaveLength(2);
    });

    test("keeps the edit and retries after a failed push", async ({ page }) => {
        await openRemote(page);
        await page.evaluate(() => (window.__fake.failPush = true));
        await rename(page, "offline");
        await page.clock.runFor(31_000);
        await expect(status(page)).toHaveText("Sync failed — retrying");
        await expect(page.getByLabel("Resume filename")).toHaveValue("offline");
        await page.evaluate(() => (window.__fake.failPush = false));
        await page.clock.runFor(120_000);
        await expect(status(page)).toContainText("Autosaved");
    });

    test("Commit Changes squashes the session into one default commit", async ({
        page,
    }) => {
        await openRemote(page);
        await rename(page, "first");
        await page.clock.runFor(31_000);
        await rename(page, "second");
        await page.clock.runFor(61_000);
        expect(await fake<unknown[]>(page, "sessionCommits")).toHaveLength(2);
        await page.getByRole("button", { name: "Commit Changes" }).click();
        await expect(status(page)).toHaveText("Saved");
        expect(await fake(page, "commits")).toEqual([
            { path: "remote.json", message: "update second" },
        ]);
        expect(await fake(page, "remoteBranches")).toEqual([]);
    });

    test("asks how to resolve a conflicting change", async ({ page }) => {
        await openRemote(page);
        await rename(page, "mine");
        await page.clock.runFor(31_000);
        await page.evaluate(() =>
            window.__fake.moveDefault(
                "remote.json",
                JSON.stringify({
                    filename: "theirs",
                    date: "01-01-26",
                    schema_version: 1,
                    sections: [],
                }),
            ),
        );
        await page.getByRole("button", { name: "Commit Changes" }).click();
        await expect(page.getByRole("alert")).toContainText(
            "changed in the repository",
        );
        expect(await fake(page, "commits")).toEqual([]);

        await page.getByRole("button", { name: "Take remote" }).click();
        await expect(page.getByLabel("Resume filename")).toHaveValue("theirs");
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(status(page)).toHaveText("Saved");
        expect(await fake(page, "remoteBranches")).toEqual([]);
    });

    test("keep mine overwrites the newer remote version", async ({ page }) => {
        await openRemote(page);
        await rename(page, "mine");
        await page.evaluate(() =>
            window.__fake.moveDefault(
                "remote.json",
                JSON.stringify({
                    filename: "theirs",
                    date: "01-01-26",
                    schema_version: 1,
                    sections: [],
                }),
            ),
        );
        await page.getByRole("button", { name: "Commit Changes" }).click();
        await page.getByRole("button", { name: "Keep mine" }).click();
        await expect(status(page)).toHaveText("Saved");
        expect(await fake(page, "commits")).toEqual([
            { path: "remote.json", message: "update mine" },
        ]);
        await expect(page.getByLabel("Resume filename")).toHaveValue("mine");
    });
});
