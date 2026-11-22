import { expect, type Page } from "@playwright/test";

export const TOKEN = "ghp_e2e_secret_token";

export interface IFakeGit {
    /** Files on the default branch. */
    files: Record<string, string>;
    /** Default-branch commits, newest last. */
    commits: { path: string; message: string }[];
    /** Commits on session branches. */
    sessionCommits: { branch: string; path: string; message: string }[];
    /** Session branches that exist on the remote. */
    remoteBranches: string[];
    pushes: string[];
    failPush: boolean;
    /** Simulates someone else committing `path` to the default branch. */
    moveDefault(path: string, content: string): void;
}

declare global {
    interface Window {
        __fake: IFakeGit;
    }
}

// A real git host is unreachable here (the proxy only allows public https),
// so the GitClient boundary is faked in the page through the dev-only
// `window.__commitcvGitFactory` seam. It models branches, a default-branch
// head sha per commit, pushes and squashes closely enough for the sync flow.
export async function fakeGit(page: Page) {
    await page.addInitScript(() => {
        const fail = (name: string, message: string) =>
            Object.assign(new Error(message), { name });
        const heads = { main: "m0" };
        const snapshots: Record<string, Record<string, string>> = {};
        const branches: Record<string, Record<string, string>> = {
            main: {
                "remote.json": JSON.stringify({
                    filename: "remote-resume",
                    date: "01-01-26",
                    schema_version: 1,
                    sections: [],
                }),
            },
        };
        snapshots.m0 = { ...branches.main };
        let n = 0;
        const advance = () => {
            heads.main = `m${++n}`;
            snapshots[heads.main] = { ...branches.main };
        };
        const fake = {
            files: branches.main,
            commits: [] as { path: string; message: string }[],
            sessionCommits: [] as {
                branch: string;
                path: string;
                message: string;
            }[],
            remoteBranches: [] as string[],
            pushes: [] as string[],
            failPush: false,
            moveDefault(path: string, content: string) {
                branches.main[path] = content;
                advance();
            },
        };
        window.__fake = fake;
        window.__commitcvGitFactory = (c) => ({
            async cloneOrOpen() {
                if (c.token === "bad-token") {
                    throw fail("GitAuthError", "Authentication failed.");
                }
                if (c.token.startsWith("net-")) {
                    throw fail("GitNetworkError", `Network error: ${c.token}`);
                }
                return { defaultBranch: "main", headSha: heads.main };
            },
            async readFile(ref: string, path: string) {
                const files = branches[ref] ?? snapshots[ref];
                return files?.[path] ?? null;
            },
            async listFiles() {
                return Object.keys(branches.main)
                    .filter((f) => f.endsWith(".json"))
                    .sort();
            },
            async commitFile(o: {
                branch: string;
                path: string;
                content: string;
                message: string;
            }) {
                branches[o.branch] ??= { ...branches.main };
                branches[o.branch][o.path] = o.content;
                if (o.branch === "main") {
                    fake.commits.push({ path: o.path, message: o.message });
                    advance();
                } else {
                    fake.sessionCommits.push({
                        branch: o.branch,
                        path: o.path,
                        message: o.message,
                    });
                }
                return `s${fake.sessionCommits.length}`;
            },
            async removeFile(o: { path: string; message: string }) {
                delete branches.main[o.path];
                fake.commits.push({ path: o.path, message: o.message });
                advance();
                return "sha";
            },
            async squashToDefault(o: {
                sessionBranch: string;
                path: string;
                message: string;
                content?: string;
            }) {
                branches.main[o.path] =
                    o.content ?? branches[o.sessionBranch][o.path];
                fake.commits.push({ path: o.path, message: o.message });
                advance();
                return heads.main;
            },
            async push({ branch }: { branch: string }) {
                if (fake.failPush) {
                    throw fail("GitNetworkError", "Network error: offline");
                }
                fake.pushes.push(branch);
                if (
                    branch !== "main" &&
                    !fake.remoteBranches.includes(branch)
                ) {
                    fake.remoteBranches.push(branch);
                }
            },
            async deleteRemoteBranch(branch: string) {
                fake.remoteBranches = fake.remoteBranches.filter(
                    (b) => b !== branch,
                );
            },
            async deleteLocalBranch(branch: string) {
                delete branches[branch];
            },
            async resetToRemote() {
                return heads.main;
            },
        });
    });
}

export async function connect(page: Page) {
    await fakeGit(page);
    await page.goto("/connect");
    await page.getByLabel("Repository URL").fill("https://github.com/acme/cv");
    await page.getByLabel("Access token").fill(TOKEN);
    await page.getByLabel("Author name").fill("Ada");
    await page.getByLabel("Author email").fill("ada@example.com");
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(page.getByTestId("connection")).toContainText("acme/cv");
}
