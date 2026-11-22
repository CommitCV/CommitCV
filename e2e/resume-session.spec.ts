import { test, expect, type Page } from "@playwright/test";
import { connect } from "./fixtures/fake-git";

// The fake git keeps its state in localStorage, so a navigation behaves like
// closing the tab and coming back; `seedSession` stands in for another device.
const doc = (filename: string) =>
    JSON.stringify(
        { filename, date: "01-01-26", schema_version: 1, sections: [] },
        null,
        4,
    );

const seed = (page: Page, filename: string, minutesAgo = 5) =>
    page.evaluate(
        ([content, ago]) =>
            window.__fake.seedSession({
                path: "remote.json",
                content: content as string,
                minutesAgo: ago as number,
            }),
        [doc(filename), minutesAgo],
    );

async function reopen(page: Page) {
    await page.goto("/connect");
    await page.getByTestId("connection").getByRole("button").first().click();
}
const openFile = (page: Page) =>
    page.getByRole("button", { name: "Open remote.json" }).click();
const dialog = (page: Page) => page.getByRole("dialog");
const rename = (page: Page, name: string) =>
    page.getByLabel("Resume filename").fill(name);
const status = (page: Page) => page.getByRole("status");
const fake = <T>(page: Page, key: string) =>
    page.evaluate(
        (k) => (window.__fake as unknown as Record<string, T>)[k],
        key,
    );

async function startOnSeeded(page: Page, filename = "seeded") {
    await page.clock.install();
    await connect(page);
    const branch = await seed(page, filename);
    await reopen(page);
    await openFile(page);
    await dialog(page)
        .getByRole("button", { name: "Continue session" })
        .click();
    await expect(page).toHaveURL(/\/editor$/);
    await expect(page.getByLabel("Resume filename")).toHaveValue(filename);
    return branch;
}

test.describe("resuming an unsquashed session", () => {
    test("asks before editing and Cancel leaves everything alone", async ({
        page,
    }) => {
        await connect(page);
        const branch = await seed(page, "seeded");
        await reopen(page);
        await openFile(page);
        await expect(dialog(page)).toBeVisible();
        await expect(
            dialog(page).getByRole("heading", {
                name: "Unsaved session for remote.json",
            }),
        ).toBeVisible();
        await expect(dialog(page)).toContainText("5m ago");
        await dialog(page).getByRole("button", { name: "Cancel" }).click();
        await expect(dialog(page)).toHaveCount(0);
        await expect(page).toHaveURL(/\/connect$/);
        expect(await fake(page, "remoteBranches")).toEqual([branch]);
    });

    test("opens straight into the editor when there is no session", async ({
        page,
    }) => {
        await connect(page);
        await reopen(page);
        await openFile(page);
        await expect(page).toHaveURL(/\/editor$/);
        await expect(dialog(page)).toHaveCount(0);
    });

    test("Continue loads the session and keeps autosaving the same branch", async ({
        page,
    }) => {
        const branch = await startOnSeeded(page);
        await rename(page, "seeded two");
        await page.clock.runFor(31_000);
        await expect(status(page)).toContainText("Autosaved");
        expect(await fake(page, "remoteBranches")).toEqual([branch]);
        const commits = await fake<{ branch: string }[]>(
            page,
            "sessionCommits",
        );
        expect(commits.map((c) => c.branch)).toEqual([branch]);
        await page.getByRole("button", { name: "Commit Changes" }).click();
        await expect(status(page)).toHaveText("Saved");
        expect(await fake<unknown[]>(page, "commits")).toHaveLength(1);
        expect(await fake(page, "remoteBranches")).toEqual([]);
    });

    test("after a reload, Continue offers the unpushed local edits", async ({
        page,
    }) => {
        await page.clock.install();
        await connect(page);
        await reopen(page);
        await openFile(page);
        await rename(page, "first");
        await page.clock.runFor(31_000);
        await expect(status(page)).toContainText("Autosaved");
        await page.evaluate(() => (window.__fake.failPush = true));
        await rename(page, "second");
        await page.clock.runFor(61_000);
        await expect(status(page)).toHaveText("Sync failed — retrying");

        await reopen(page);
        await openFile(page);
        await dialog(page)
            .getByRole("button", { name: "Continue session" })
            .click();
        await expect(
            dialog(page).getByRole("heading", {
                name: "You have unsaved local edits",
            }),
        ).toBeVisible();
        await dialog(page)
            .getByRole("button", { name: "Use my unsaved local edits" })
            .click();
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).toHaveValue("second");
        const [branch] = await fake<string[]>(page, "remoteBranches");
        expect(
            await page.evaluate(
                (b) => window.__fake.remoteFile(b, "remote.json"),
                branch,
            ),
        ).toContain('"second"');
    });

    test("removing a repository warns when unpushed local edits would be lost", async ({
        page,
    }) => {
        await page.clock.install();
        await connect(page);
        await reopen(page);
        await openFile(page);
        await rename(page, "first");
        await page.clock.runFor(31_000);
        await expect(status(page)).toContainText("Autosaved");
        await page.evaluate(() => (window.__fake.failPush = true));
        await rename(page, "second");
        await page.clock.runFor(61_000);
        await expect(status(page)).toHaveText("Sync failed — retrying");

        await page.goto("/connect");
        await page.getByRole("link", { name: "Resume Library" }).click();
        const repo = page.getByTestId("remote-repo");
        await repo.getByRole("button", { name: /^Remove / }).click();
        await expect(repo).toContainText("Unsynced edits will be lost.");
    });

    test("removing a repository with nothing unsynced shows no warning", async ({
        page,
    }) => {
        await connect(page);
        await page.getByRole("link", { name: "Resume Library" }).click();
        const repo = page.getByTestId("remote-repo");
        await repo.getByRole("button", { name: /^Remove / }).click();
        await expect(repo).toContainText("Remove this repository?");
        await expect(repo).not.toContainText("Unsynced edits");
    });

    test("the session as saved replaces unpushed local edits", async ({
        page,
    }) => {
        await page.clock.install();
        await connect(page);
        await reopen(page);
        await openFile(page);
        await rename(page, "first");
        await page.clock.runFor(31_000);
        await page.evaluate(() => (window.__fake.failPush = true));
        await rename(page, "second");
        await page.clock.runFor(61_000);
        await reopen(page);
        await openFile(page);
        await dialog(page)
            .getByRole("button", { name: "Continue session" })
            .click();
        await dialog(page)
            .getByRole("button", { name: "Use session as saved" })
            .click();
        await expect(page.getByLabel("Resume filename")).toHaveValue("first");
    });

    test("Discard asks to confirm, deletes the branch and opens the committed file", async ({
        page,
    }) => {
        await connect(page);
        await seed(page, "seeded");
        await reopen(page);
        await openFile(page);
        await dialog(page)
            .getByRole("button", { name: "Discard session" })
            .click();
        await expect(dialog(page)).toContainText("cannot be undone");
        expect(await fake<string[]>(page, "remoteBranches")).toHaveLength(1);
        await dialog(page)
            .getByRole("button", { name: "Yes, discard" })
            .click();
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).toHaveValue(
            "remote-resume",
        );
        expect(await fake(page, "remoteBranches")).toEqual([]);
        expect(await fake(page, "commits")).toEqual([]);
    });

    test("Back from the discard confirmation keeps the session", async ({
        page,
    }) => {
        await connect(page);
        await seed(page, "seeded");
        await reopen(page);
        await openFile(page);
        await dialog(page)
            .getByRole("button", { name: "Discard session" })
            .click();
        await dialog(page).getByRole("button", { name: "Back" }).click();
        await expect(
            dialog(page).getByRole("button", { name: "Continue session" }),
        ).toBeVisible();
        expect(await fake<string[]>(page, "remoteBranches")).toHaveLength(1);
    });

    test("Squash it now makes one default-branch commit", async ({ page }) => {
        await connect(page);
        await seed(page, "seeded");
        await reopen(page);
        await openFile(page);
        await dialog(page)
            .getByRole("button", { name: "Squash it now" })
            .click();
        await dialog(page).getByRole("button", { name: "Yes, squash" }).click();
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).toHaveValue("seeded");
        const commits = await fake<{ path: string }[]>(page, "commits");
        expect(commits).toHaveLength(1);
        expect(commits[0].path).toBe("remote.json");
        expect(await fake(page, "remoteBranches")).toEqual([]);
    });

    test("shows a badge for files with a session, in the library and on connect", async ({
        page,
    }) => {
        await connect(page);
        await seed(page, "seeded", 90);
        await page.goto("/library");
        const badge = page
            .getByLabel("Remote repositories")
            .getByTestId("session-badge");
        await expect(badge).toHaveText("Unsaved session · 1h ago");
        await reopen(page);
        await expect(page.getByTestId("session-badge")).toContainText(
            "Unsaved session",
        );
    });

    test("no badge without a session", async ({ page }) => {
        await connect(page);
        await page.goto("/library");
        await expect(
            page.getByLabel("Remote repositories").getByRole("button", {
                name: "Open remote.json",
            }),
        ).toBeVisible();
        await expect(page.getByTestId("session-badge")).toHaveCount(0);
    });

    test.describe("when the session was updated on another device", () => {
        async function diverge(page: Page) {
            const branch = await startOnSeeded(page);
            await rename(page, "mine");
            await page.clock.runFor(31_000);
            await expect(status(page)).toContainText("Autosaved");
            await page.evaluate(
                ([b, content]) =>
                    window.__fake.moveSession(b, "remote.json", content),
                [branch, doc("theirs")],
            );
            await rename(page, "mine again");
            await page.clock.runFor(61_000);
            await expect(page.getByRole("alert")).toContainText(
                "This session was updated elsewhere.",
            );
            const remote = () =>
                page.evaluate(
                    (b) => window.__fake.remoteFile(b, "remote.json"),
                    branch,
                );
            expect(await remote()).toContain('"theirs"');
            return { remote };
        }

        test("does not overwrite until asked, then Keep my version wins", async ({
            page,
        }) => {
            const { remote } = await diverge(page);
            await expect(status(page)).toHaveText("Sync paused");
            await page.clock.runFor(120_000);
            expect(await remote()).toContain('"theirs"');
            await page.getByRole("button", { name: /Keep my version/ }).click();
            await expect(page.getByRole("alert")).toHaveCount(0);
            await expect(status(page)).toContainText("Autosaved");
            expect(await remote()).toContain('"mine again"');
        });

        test("Use remote version loads their edit", async ({ page }) => {
            const { remote } = await diverge(page);
            await page
                .getByRole("button", { name: "Use remote version" })
                .click();
            await expect(page.getByLabel("Resume filename")).toHaveValue(
                "theirs",
            );
            await expect(page.getByRole("alert")).toHaveCount(0);
            expect(await remote()).toContain('"theirs"');
        });
    });
});
