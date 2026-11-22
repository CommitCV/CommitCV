import { test, expect, type Page } from "@playwright/test";

const TOKEN = "ghp_e2e_secret_token";

// A real git host is unreachable here (the proxy only allows public https),
// so the GitClient boundary is faked in the page through the dev-only
// `window.__commitcvGitFactory` seam.
async function fakeGit(page: Page) {
    await page.addInitScript(() => {
        const files: Record<string, string> = {
            "remote.json": JSON.stringify({
                filename: "remote-resume",
                date: "01-01-26",
                schema_version: 1,
                sections: [],
            }),
        };
        const commits: { path: string; message: string }[] = [];
        Object.assign(window, { __fake: { files, commits } });
        const fail = (name: string, message: string) =>
            Object.assign(new Error(message), { name });
        window.__commitcvGitFactory = (c) => ({
            async cloneOrOpen() {
                if (c.token === "bad-token") {
                    throw fail("GitAuthError", "Authentication failed.");
                }
                if (c.token.startsWith("net-")) {
                    throw fail("GitNetworkError", `Network error: ${c.token}`);
                }
                return { defaultBranch: "main", headSha: "abc" };
            },
            async readFile(_branch: string, path: string) {
                return files[path] ?? null;
            },
            async listFiles() {
                return Object.keys(files)
                    .filter((f) => f.endsWith(".json"))
                    .sort();
            },
            async commitFile(o: {
                path: string;
                content: string;
                message: string;
            }) {
                files[o.path] = o.content;
                commits.push({ path: o.path, message: o.message });
                return "sha";
            },
            async removeFile(o: { path: string; message: string }) {
                delete files[o.path];
                commits.push({ path: o.path, message: o.message });
                return "sha";
            },
            async push() {},
            async resetToRemote() {},
        });
    });
}

async function fill(page: Page, token = TOKEN) {
    await page.getByLabel("Repository URL").fill("https://github.com/acme/cv");
    await page.getByLabel("Access token").fill(token);
    await page.getByLabel("Author name").fill("Ada");
    await page.getByLabel("Author email").fill("ada@example.com");
}

async function connect(page: Page) {
    await fakeGit(page);
    await page.goto("/connect");
    await fill(page);
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(page.getByTestId("connection")).toContainText("acme/cv");
}

test.describe("connect a repository", () => {
    test("requires every field and rejects unsupported URLs", async ({
        page,
    }) => {
        await fakeGit(page);
        await page.goto("/connect");
        const test_ = page.getByRole("button", { name: "Test connection" });
        await expect(test_).toBeDisabled();
        await expect(page.getByLabel("Access token")).toHaveAttribute(
            "type",
            "password",
        );
        await fill(page);
        await expect(test_).toBeEnabled();
        await page.getByLabel("Repository URL").fill("git@github.com:a/b.git");
        await expect(
            page.getByText(/SSH URLs are not supported/),
        ).toBeVisible();
        await test_.click();
        await expect(page.getByRole("alert")).toContainText(/SSH URLs/);
    });

    test("shows auth and network errors without echoing the token", async ({
        page,
    }) => {
        await fakeGit(page);
        await page.goto("/connect");
        await fill(page, "bad-token");
        await page.getByRole("button", { name: "Test connection" }).click();
        await expect(page.getByRole("alert")).toContainText(
            /Authentication failed/,
        );
        await fill(page, "net-secret-123");
        await page.getByRole("button", { name: "Test connection" }).click();
        await expect(page.getByRole("alert")).toContainText(/Could not reach/);
        expect(await page.locator("body").innerText()).not.toContain(
            "net-secret-123",
        );
        await expect(page.getByTestId("connection")).toHaveCount(0);
    });

    test("saves a connection, keeps the token out of localStorage and opens a file", async ({
        page,
    }) => {
        await connect(page);
        expect(await page.locator("body").innerText()).not.toContain(TOKEN);
        const local = await page.evaluate(() =>
            JSON.stringify({ ...localStorage }),
        );
        expect(local).not.toContain(TOKEN);

        await page.reload();
        await expect(page.getByTestId("connection")).toContainText("acme/cv");
        await page
            .getByTestId("connection")
            .getByRole("button")
            .first()
            .click();
        await page.getByRole("button", { name: "Open remote.json" }).click();
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).toHaveValue(
            "remote-resume",
        );
        const draft = await page.evaluate(() =>
            localStorage.getItem("commitcv:draft"),
        );
        expect(draft).not.toContain(TOKEN);
        expect(draft).toContain('"kind":"git"');

        await page.getByLabel("Resume filename").fill("renamed");
        await page.getByRole("button", { name: "Commit Changes" }).click();
        await expect(page.getByRole("status")).toHaveText("Saved");
        const commits = await page.evaluate(
            () =>
                (window as unknown as { __fake: { commits: unknown[] } }).__fake
                    .commits,
        );
        expect(commits).toEqual([
            { path: "remote.json", message: "update renamed" },
        ]);
    });

    test("creates a new resume in the repository", async ({ page }) => {
        await connect(page);
        await page
            .getByRole("textbox", { name: "New resume file name" })
            .fill("My CV");
        await page.getByRole("button", { name: "Create and commit" }).click();
        await expect(page).toHaveURL(/\/editor$/);
        const commits = await page.evaluate(
            () =>
                (window as unknown as { __fake: { commits: unknown[] } }).__fake
                    .commits,
        );
        expect(commits).toEqual([
            { path: "my-cv.json", message: "add my-cv.json" },
        ]);
    });

    test("lists remote resumes on the library page", async ({ page }) => {
        await connect(page);
        await page.getByRole("link", { name: "Resume Library" }).click();
        const repo = page.getByTestId("remote-repo");
        await expect(repo).toContainText("acme/cv");
        await repo.getByRole("button", { name: "Open remote.json" }).click();
        await expect(page).toHaveURL(/\/editor$/);
    });

    test("removes a connection only after confirming", async ({ page }) => {
        await connect(page);
        await page.getByRole("button", { name: "Remove acme/cv" }).click();
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(page.getByTestId("connection")).toHaveCount(1);
        await page.getByRole("button", { name: "Remove acme/cv" }).click();
        await page.getByRole("button", { name: "Confirm remove" }).click();
        await expect(page.getByTestId("connection")).toHaveCount(0);
    });

    test("hides the template option when no template URL is configured", async ({
        page,
    }) => {
        await page.goto("/connect");
        await expect(
            page.getByRole("heading", { name: "Connect a repository" }),
        ).toBeVisible();
        await expect(
            page.getByText("Create from the CommitCV template"),
        ).toHaveCount(0);
    });
});
