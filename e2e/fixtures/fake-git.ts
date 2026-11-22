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
    /**
     * Simulates another device that left an unsquashed session on the
     * remote; returns its branch name.
     */
    seedSession(opts: {
        path: string;
        content: string;
        message?: string;
        minutesAgo?: number;
    }): string;
    /** Simulates another device pushing a new commit to a session branch. */
    moveSession(branch: string, path: string, content: string): void;
    /**
     * Gives `path` a default-branch history, oldest first; the last version
     * becomes the file's content. History starts shallow (10 commits).
     */
    seedHistory(
        path: string,
        versions: { content: string; message: string; minutesAgo: number }[],
    ): void;
    /** A file on the remote copy of a session branch. */
    remoteFile(branch: string, path: string): string | null;
}

declare global {
    interface Window {
        __fake: IFakeGit;
    }
}

// A real git host is unreachable here (the proxy only allows public https),
// so the GitClient boundary is faked in the page through the dev-only
// `window.__commitcvGitFactory` seam. It models branches, a default-branch
// head sha per commit, pushes (with fast-forward checks) and squashes closely
// enough for the sync flow. State lives in localStorage so it survives a
// reload, like the remote and the browser's git storage would.
export async function fakeGit(page: Page) {
    await page.addInitScript(() => {
        const fail = (name: string, message: string) =>
            Object.assign(new Error(message), { name });
        interface IBranch {
            base: string;
            head: string;
            files: Record<string, string>;
            /** Oldest first. */
            chain: { sha: string; message: string; date: number }[];
        }
        interface IState {
            n: number;
            sn: number;
            head: string;
            main: Record<string, string>;
            snapshots: Record<string, Record<string, string>>;
            commits: { path: string; message: string }[];
            /** Every default-branch commit, oldest first (for `log`). */
            log: { sha: string; path: string; message: string; date: number }[];
            /** How many of the newest log commits are fetched. */
            visible: number;
            sessionCommits: { branch: string; path: string; message: string }[];
            pushes: string[];
            /** This browser's branches, the server's, and fetched copies. */
            local: Record<string, IBranch>;
            remote: Record<string, IBranch>;
            tracking: Record<string, IBranch>;
        }
        const KEY = "__fakeGitState";
        const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
        const fresh = (): IState => {
            const main = {
                "remote.json": JSON.stringify({
                    filename: "remote-resume",
                    date: "01-01-26",
                    schema_version: 1,
                    sections: [],
                }),
            };
            return {
                n: 0,
                sn: 0,
                head: "m0",
                main,
                snapshots: { m0: clone(main) },
                commits: [],
                log: [],
                visible: 10,
                sessionCommits: [],
                pushes: [],
                local: {},
                remote: {},
                tracking: {},
            };
        };
        const restore = (): IState => {
            try {
                const saved = localStorage.getItem(KEY);
                if (saved) return JSON.parse(saved) as IState;
            } catch {
                /* start fresh */
            }
            return fresh();
        };
        const S = restore();
        const save = () => {
            try {
                localStorage.setItem(KEY, JSON.stringify(S));
            } catch {
                /* ignore */
            }
        };
        const advance = (path = "", message = "", date = Date.now()) => {
            S.head = `m${++S.n}`;
            S.snapshots[S.head] = clone(S.main);
            if (path) S.log.push({ sha: S.head, path, message, date });
        };
        const filesOf = (ref: string) =>
            ref === "main"
                ? S.main
                : (S.snapshots[ref] ??
                  S.local[ref]?.files ??
                  S.tracking[ref]?.files);
        const slug = (path: string) =>
            path
                .replace(/\.json$/, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") || "resume";
        const addCommit = (
            b: IBranch,
            path: string,
            content: string,
            message: string,
            date = Date.now(),
        ) => {
            const sha = `s${++S.sn}`;
            b.files[path] = content;
            b.head = sha;
            b.chain.push({ sha, message, date });
            S.snapshots[sha] = clone(b.files);
            return sha;
        };
        const fake = {
            get files() {
                return S.main;
            },
            get commits() {
                return S.commits;
            },
            get sessionCommits() {
                return S.sessionCommits;
            },
            get remoteBranches() {
                return Object.keys(S.remote).sort();
            },
            get pushes() {
                return S.pushes;
            },
            failPush: false,
            seedHistory(
                path: string,
                versions: {
                    content: string;
                    message: string;
                    minutesAgo: number;
                }[],
            ) {
                for (const v of versions) {
                    S.main[path] = v.content;
                    advance(
                        path,
                        v.message,
                        Date.now() - v.minutesAgo * 60_000,
                    );
                }
                save();
            },
            moveDefault(path: string, content: string) {
                S.main[path] = content;
                advance(path, "update elsewhere");
                save();
            },
            seedSession(o: {
                path: string;
                content: string;
                message?: string;
                minutesAgo?: number;
            }) {
                const branch = `commitcv/${slug(o.path)}-e2e${String(++S.sn).padStart(5, "0")}`;
                const b: IBranch = {
                    base: S.head,
                    head: "",
                    files: clone(S.main),
                    chain: [],
                };
                addCommit(
                    b,
                    o.path,
                    o.content,
                    o.message ?? "update seeded",
                    Date.now() - (o.minutesAgo ?? 5) * 60_000,
                );
                S.remote[branch] = b;
                save();
                return branch;
            },
            moveSession(branch: string, path: string, content: string) {
                addCommit(S.remote[branch], path, content, "update elsewhere");
                save();
            },
            remoteFile(branch: string, path: string) {
                return S.remote[branch]?.files[path] ?? null;
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
                return { defaultBranch: "main", headSha: S.head };
            },
            async readFile(ref: string, path: string) {
                return filesOf(ref)?.[path] ?? null;
            },
            async listFiles() {
                return Object.keys(S.main)
                    .filter((f) => f.endsWith(".json"))
                    .sort();
            },
            async commitFile(o: {
                branch: string;
                path: string;
                content: string;
                message: string;
            }) {
                if (o.branch === "main") {
                    S.main[o.path] = o.content;
                    S.commits.push({ path: o.path, message: o.message });
                    advance(o.path, o.message);
                    save();
                    return S.head;
                }
                S.local[o.branch] ??= clone(
                    S.tracking[o.branch] ?? {
                        base: S.head,
                        head: "",
                        files: S.main,
                        chain: [],
                    },
                );
                const sha = addCommit(
                    S.local[o.branch],
                    o.path,
                    o.content,
                    o.message,
                );
                S.sessionCommits.push({
                    branch: o.branch,
                    path: o.path,
                    message: o.message,
                });
                save();
                return sha;
            },
            async isShallow() {
                return S.visible < S.log.length;
            },
            async deepen(n: number) {
                S.visible += n;
                save();
            },
            async log(_ref: string, path: string) {
                return S.log
                    .slice(-S.visible)
                    .filter((c) => c.path === path)
                    .reverse()
                    .map((c) => ({
                        sha: c.sha,
                        message: c.message,
                        author: { name: "Ada", email: "ada@example.com" },
                        date: new Date(c.date),
                    }));
            },
            async removeFile(o: { path: string; message: string }) {
                delete S.main[o.path];
                S.commits.push({ path: o.path, message: o.message });
                advance();
                save();
                return "sha";
            },
            async squashToDefault(o: {
                sessionBranch: string;
                path: string;
                message: string;
                body?: string;
                content?: string;
            }) {
                S.main[o.path] = o.content ?? filesOf(o.sessionBranch)![o.path];
                S.commits.push({ path: o.path, message: o.message });
                advance(o.path, o.message);
                save();
                return S.head;
            },
            async push({ branch, force }: { branch: string; force?: boolean }) {
                if (fake.failPush) {
                    throw fail("GitNetworkError", "Network error: offline");
                }
                if (branch !== "main") {
                    const local = S.local[branch];
                    const remote = S.remote[branch];
                    // Fast-forward only: the remote head must be in our history.
                    if (
                        remote &&
                        !force &&
                        !local.chain.some((c) => c.sha === remote.head)
                    ) {
                        throw fail(
                            "GitConflictError",
                            "Remote has changes you do not have.",
                        );
                    }
                    S.remote[branch] = clone(local);
                }
                S.pushes.push(branch);
                save();
            },
            async deleteRemoteBranch(branch: string) {
                delete S.remote[branch];
                save();
            },
            async deleteLocalBranch(branch: string) {
                delete S.local[branch];
                delete S.tracking[branch];
                save();
            },
            async resetToRemote(branch: string) {
                if (branch === "main") return S.head;
                const copy = clone(S.tracking[branch] ?? S.remote[branch]);
                S.local[branch] = copy;
                save();
                return copy.head;
            },
            async listRemoteBranches(prefix = "") {
                return Object.keys(S.remote)
                    .filter((b) => b.startsWith(prefix))
                    .sort();
            },
            async listRemoteRefs(prefix = "") {
                return Object.keys(S.remote)
                    .filter((b) => b.startsWith(prefix))
                    .sort()
                    .map((name) => ({ name, oid: S.remote[name].head }));
            },
            async sessionCommits(
                branch: string,
                { remote = true }: { remote?: boolean } = {},
            ) {
                if (remote && S.remote[branch]) {
                    S.tracking[branch] = clone(S.remote[branch]);
                    save();
                }
                const b = remote ? S.remote[branch] : S.local[branch];
                if (!b) throw fail("GitError", `Unknown ref: ${branch}`);
                return {
                    headSha: b.head,
                    baseSha: b.base,
                    commits: [...b.chain].reverse().map((c) => ({
                        sha: c.sha,
                        message: c.message,
                        date: new Date(c.date),
                    })),
                };
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
