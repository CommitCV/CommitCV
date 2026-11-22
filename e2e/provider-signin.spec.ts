import { test, expect, type Page } from "@playwright/test";
import { fakeGit, TOKEN } from "./fixtures/fake-git";

const PROVIDERS = [
    { provider: "github", hosts: ["github.com"] },
    { provider: "forgejo", hosts: ["codeberg.org", "git.example.org"] },
];

const REPOS = [
    {
        fullName: "ada/cv",
        cloneUrl: "https://github.com/ada/cv",
        defaultBranch: "main",
        private: true,
    },
    {
        fullName: "ada/blog",
        cloneUrl: "https://github.com/ada/blog",
        defaultBranch: "main",
        private: false,
    },
];

interface MockOptions {
    providers?: unknown[];
    handoff?: { status: number; body: unknown };
}

async function mockOAuth(page: Page, opts: MockOptions = {}) {
    const seen: { handoff: number; repoQueries: string[] } = {
        handoff: 0,
        repoQueries: [],
    };
    await page.route("**/api/oauth/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/providers")) {
            return route.fulfill({
                json: { providers: opts.providers ?? PROVIDERS },
            });
        }
        if (url.pathname.endsWith("/handoff")) {
            seen.handoff++;
            const { status, body } = opts.handoff ?? {
                status: 200,
                body: {
                    provider: "github",
                    host: "github.com",
                    accessToken: TOKEN,
                    user: { name: "Ada L", login: "ada" },
                },
            };
            return route.fulfill({ status, json: body });
        }
        if (url.pathname.endsWith("/repos")) {
            const q = url.searchParams.get("q") ?? "";
            seen.repoQueries.push(q);
            expect(route.request().headers().authorization).toBe(
                `Bearer ${TOKEN}`,
            );
            return route.fulfill({
                json: { repos: REPOS.filter((r) => r.fullName.includes(q)) },
            });
        }
        return route.fulfill({ status: 404, json: {} });
    });
    return seen;
}

test.describe("sign in with a git host", () => {
    test("offers only the configured providers and an instance chooser", async ({
        page,
    }) => {
        await mockOAuth(page);
        await page.goto("/signin");
        await expect(
            page.getByRole("button", { name: "Sign in with GitHub" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Sign in with Codeberg" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Sign in with GitLab" }),
        ).toHaveCount(0);
        await expect(
            page.getByRole("button", { name: "Sign in with Bitbucket" }),
        ).toHaveCount(0);

        const instance = page.getByLabel("Codeberg instance");
        await expect(instance.locator("option")).toHaveText([
            "codeberg.org",
            "git.example.org",
        ]);
        await instance.selectOption("git.example.org");
        const login = page.waitForRequest(/\/api\/oauth\/login\?/);
        await page.route("**/api/oauth/login*", (route) => route.abort());
        await page
            .getByRole("button", { name: "Sign in with Forgejo" })
            .click();
        const params = new URL((await login).url()).searchParams;
        expect(params.get("provider")).toBe("forgejo");
        expect(params.get("host")).toBe("git.example.org");
    });

    test("the sign-in page offers only git hosts, then lands in the library", async ({
        page,
    }) => {
        await fakeGit(page);
        await mockOAuth(page);
        await page.goto("/signin");
        await expect(
            page.getByRole("heading", { name: "Sign in", exact: true }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Sign in with GitHub" }),
        ).toBeVisible();
        await expect(page.getByLabel("Repository URL")).toHaveCount(0);

        const login = page.waitForRequest(/\/api\/oauth\/login\?/);
        await page.route("**/api/oauth/login*", (route) => route.abort());
        await page.getByRole("button", { name: "Sign in with GitHub" }).click();
        const params = new URL((await login).url()).searchParams;
        expect(params.get("return")).toBe("/signin");

        await page.unroute("**/api/oauth/login*");
        await page.goto("/signin?signed_in=github");
        const panel = page.getByRole("region", {
            name: "Sign in with a git host",
        });
        await panel.getByLabel("Author email").fill("ada@example.com");
        await page.getByRole("button", { name: "Use ada/cv" }).click();
        await expect(page).toHaveURL(/\/library$/);
    });

    test("refreshes the repo list and steps back to the providers", async ({
        page,
    }) => {
        await fakeGit(page);
        const seen = await mockOAuth(page);
        await page.goto("/signin?signed_in=github");
        await expect(
            page.getByRole("button", { name: "Use ada/cv" }),
        ).toBeVisible();
        const before = seen.repoQueries.length;
        await page.getByRole("button", { name: "Refresh list" }).click();
        await expect(
            page.getByRole("button", { name: "Use ada/cv" }),
        ).toBeVisible();
        expect(seen.repoQueries.length).toBeGreaterThan(before);

        await page.getByRole("button", { name: "← Back" }).click();
        await expect(
            page.getByRole("button", { name: "Sign in with GitHub" }),
        ).toBeVisible();
        await expect(page.getByLabel("Search repositories")).toHaveCount(0);
    });

    test("hides sign-in when nothing is configured", async ({ page }) => {
        await mockOAuth(page, { providers: [] });
        await page.goto("/signin");
        await expect(
            page.getByRole("button", { name: /Sign in with/ }),
        ).toHaveCount(0);
    });

    test("return handoff, repo search and connect keep the token out of the URL and localStorage, and encrypted in IndexedDB", async ({
        page,
    }) => {
        await fakeGit(page);
        const seen = await mockOAuth(page);
        await page.goto("/signin?signed_in=github");
        await expect(page.getByRole("status").first()).toContainText(
            "Signed in as ada on github.com",
        );
        expect(page.url()).not.toContain("signed_in");
        expect(page.url()).not.toContain(TOKEN);
        expect(seen.handoff).toBe(1);

        const panel = page.getByRole("region", {
            name: "Sign in with a git host",
        });
        await expect(panel.getByLabel("Author name")).toHaveValue("Ada L");
        // No email from the provider: the user is asked.
        const use = page.getByRole("button", { name: "Use ada/cv" });
        await expect(use).toBeDisabled();
        await panel.getByLabel("Author email").fill("ada@example.com");
        await expect(use).toBeEnabled();

        await page.getByLabel("Search repositories").fill("blog");
        await expect(
            page
                .getByRole("list", { name: "Repositories" })
                .getByRole("listitem"),
        ).toHaveCount(1);
        await expect(use).toHaveCount(0);
        await page.getByLabel("Search repositories").fill("");
        await use.click();

        await expect(page).toHaveURL(/\/library$/);
        const local = await page.evaluate(() =>
            JSON.stringify({ ...localStorage }),
        );
        expect(local).not.toContain(TOKEN);
        expect(await page.locator("body").innerText()).not.toContain(TOKEN);
        const stored = await page.evaluate(
            () =>
                new Promise<string>((resolve) => {
                    const open = indexedDB.open("commitcv");
                    open.onsuccess = () => {
                        const db = open.result;
                        const req = db
                            .transaction("connections")
                            .objectStore("connections")
                            .getAll();
                        req.onsuccess = () =>
                            resolve(JSON.stringify(req.result));
                    };
                }),
        );
        // Saved, but only as ciphertext: never readable as plain text.
        expect(stored).toContain("ada@github.com");
        expect(stored).toContain("sealed");
        expect(stored).not.toContain(TOKEN);
    });

    test("shows a readable message when the handoff fails", async ({
        page,
    }) => {
        await mockOAuth(page, {
            handoff: { status: 410, body: { error: "sign-in expired" } },
        });
        await page.goto("/signin?signed_in=github");
        await expect(page.getByRole("alert")).toContainText(
            "That sign-in expired",
        );
        await expect(
            page.getByRole("button", { name: "Sign in with GitHub" }),
        ).toBeVisible();
    });

    test("shows a readable message for a denied sign-in", async ({ page }) => {
        await mockOAuth(page);
        await page.goto("/signin?signin_error=denied");
        await expect(page.getByRole("alert")).toContainText(
            "cancelled or denied",
        );
        expect(page.url()).not.toContain("signin_error");
    });
});
