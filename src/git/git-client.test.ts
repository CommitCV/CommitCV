import { beforeEach, describe, expect, it } from "vitest";
import { createFsFromVolume, Volume } from "memfs";
import type { FsClient, HttpClient } from "isomorphic-git";
import { GitClient } from "./git-client";
import { GitAuthError, GitConflictError, GitNetworkError } from "./errors";
import { COMMITTER } from "./identity";
import { bareRepoHttp, gitIn, hasGit, makeBareRepo } from "./test-remote";

const URL_ = "https://git.example.com/me/resumes";
const TOKEN = "s3cret-token";
const author = { name: "Ada", email: "ada@example.com" };
const NOW = Date.UTC(2025, 0, 2, 3, 4, 5);

const newClient = (http: HttpClient, token = TOKEN) =>
    new GitClient({
        fs: createFsFromVolume(new Volume()) as unknown as FsClient,
        http,
        auth: { username: token, password: "x-oauth-basic" },
        author,
        now: () => NOW,
    });

describe.skipIf(!hasGit)("GitClient against a local bare repo", () => {
    let bare: string;
    let http: HttpClient;
    beforeEach(() => {
        bare = makeBareRepo({ "a.json": '{"v":1}', "note.txt": "x" });
        http = bareRepoHttp(bare, TOKEN);
    });

    it("clones shallow and reports default branch and head", async () => {
        const c = newClient(http);
        const { defaultBranch, headSha } = await c.cloneOrOpen(URL_, {
            depth: 1,
        });
        expect(defaultBranch).toBe("main");
        expect(headSha).toBe(gitIn(bare, "rev-parse", "main").trim());
        expect(await c.readFile("main", "a.json")).toBe('{"v":1}');
        expect(await c.readFile("main", "missing.json")).toBeNull();
        expect(await c.listFiles("main")).toEqual(["a.json"]);
    });

    it("reopens an existing clone with a fetch", async () => {
        const c = newClient(http);
        const first = await c.cloneOrOpen(URL_);
        const again = await c.cloneOrOpen(URL_);
        expect(again).toEqual(first);
    });

    it("commits on a new branch with user author and bot committer, then pushes", async () => {
        const c = newClient(http);
        await c.cloneOrOpen(URL_);
        const sha = await c.commitFile({
            branch: "session/one",
            path: "a.json",
            content: '{"v":2}',
            message: "feat: bump",
            body: "details",
        });
        await c.push({ branch: "session/one" });
        expect(gitIn(bare, "rev-parse", "session/one").trim()).toBe(sha);
        expect(
            gitIn(
                bare,
                "log",
                "-1",
                "--format=%an <%ae>|%cn <%ce>|%at|%B",
                "session/one",
            ),
        ).toBe(
            `Ada <ada@example.com>|${COMMITTER.name} <${COMMITTER.email}>|${NOW / 1000}|feat: bump\n\ndetails\n\n`,
        );
        expect(gitIn(bare, "show", "session/one:a.json")).toBe('{"v":2}');
        expect(gitIn(bare, "show", "session/one:note.txt")).toBe("x");
    });

    it("writes into nested directories", async () => {
        const c = newClient(http);
        await c.cloneOrOpen(URL_);
        await c.commitFile({
            branch: "b",
            path: "dir/sub/r.json",
            content: "{}",
            message: "m",
        });
        expect(await c.readFile("b", "dir/sub/r.json")).toBe("{}");
        expect(await c.listFiles("b", "dir/sub")).toEqual(["dir/sub/r.json"]);
        expect(await c.listFiles("b")).toEqual(["a.json"]);
    });

    it("removes a file, prunes empty directories and resets to the remote", async () => {
        const c = newClient(http);
        await c.cloneOrOpen(URL_);
        await c.commitFile({
            branch: "main",
            path: "d/x.json",
            content: "1",
            message: "add",
        });
        await c.removeFile({
            branch: "main",
            path: "d/x.json",
            message: "delete d/x.json",
        });
        expect(await c.readFile("main", "d/x.json")).toBeNull();
        await c.removeFile({
            branch: "main",
            path: "a.json",
            message: "delete a.json",
        });
        await c.push({ branch: "main" });
        expect(gitIn(bare, "ls-tree", "--name-only", "main").trim()).toBe(
            "note.txt",
        );
        await c.commitFile({
            branch: "main",
            path: "local.json",
            content: "x",
            message: "unpushed",
        });
        await c.resetToRemote("main");
        expect(await c.readFile("main", "local.json")).toBeNull();
    });

    it("squashes a session branch into one default-branch commit", async () => {
        const c = newClient(http);
        await c.cloneOrOpen(URL_);
        for (const v of ["2", "3"]) {
            await c.commitFile({
                branch: "commitcv/a-1",
                path: "a.json",
                content: `{"v":${v}}`,
                message: `edit ${v}`,
            });
        }
        await c.push({ branch: "commitcv/a-1" });
        const before = gitIn(bare, "rev-parse", "main").trim();
        const sha = await c.squashToDefault({
            sessionBranch: "commitcv/a-1",
            path: "a.json",
            message: "update a",
            body: "- a",
        });
        await c.push({ branch: "main" });
        expect(gitIn(bare, "rev-parse", "main").trim()).toBe(sha);
        expect(gitIn(bare, "rev-parse", "main^").trim()).toBe(before);
        expect(gitIn(bare, "show", "main:a.json")).toBe('{"v":3}');
        expect(gitIn(bare, "log", "-1", "--format=%an|%cn|%B", "main")).toBe(
            `Ada|${COMMITTER.name}|update a\n\n- a\n\n`,
        );
        await c.deleteRemoteBranch("commitcv/a-1");
        await c.deleteLocalBranch("commitcv/a-1");
        await c.deleteLocalBranch("commitcv/a-1");
        expect(await c.listRemoteBranches("commitcv/")).toEqual([]);
        expect(await c.readFile("commitcv/a-1", "a.json")).toBeNull();
    });

    it("lets a second client fetch the branch and read the file", async () => {
        const one = newClient(http);
        await one.cloneOrOpen(URL_);
        await one.commitFile({
            branch: "s/x",
            path: "a.json",
            content: '{"v":3}',
            message: "m",
        });
        await one.push({ branch: "s/x" });

        const two = newClient(http);
        await two.cloneOrOpen(URL_);
        expect(await two.readFile("s/x", "a.json")).toBeNull();
        await two.fetch({ branch: "s/x" });
        expect(await two.readFile("s/x", "a.json")).toBe('{"v":3}');
    });

    it("lists remote branches by prefix and deletes one", async () => {
        const c = newClient(http);
        await c.cloneOrOpen(URL_);
        for (const b of ["session/a", "session/b", "other"]) {
            await c.commitFile({
                branch: b,
                path: "a.json",
                content: b,
                message: "m",
            });
            await c.push({ branch: b });
        }
        expect(await c.listRemoteBranches("session/")).toEqual([
            "session/a",
            "session/b",
        ]);
        await c.deleteRemoteBranch("session/a");
        expect(await c.listRemoteBranches("session/")).toEqual(["session/b"]);
    });

    it("logs commits touching a file and deepens shallow history", async () => {
        const c = newClient(http);
        await c.cloneOrOpen(URL_);
        await c.commitFile({
            branch: "main",
            path: "a.json",
            content: "2",
            message: "second",
        });
        await c.commitFile({
            branch: "main",
            path: "note.txt",
            content: "y",
            message: "other file",
        });
        await c.commitFile({
            branch: "main",
            path: "a.json",
            content: "3",
            message: "third",
        });
        const log = await c.log("main", "a.json");
        expect(log.map((l) => l.message)).toEqual(["third", "second", "seed"]);
        expect(log[0]).toMatchObject({
            author,
            committer: COMMITTER,
            date: new Date(NOW - (NOW % 1000)),
        });
        expect(await c.log("main", "a.json", { depth: 1 })).toHaveLength(1);
    });

    it("deepen fetches older history", async () => {
        const w = newClient(http);
        await w.cloneOrOpen(URL_);
        await w.commitFile({
            branch: "main",
            path: "a.json",
            content: "2",
            message: "second",
        });
        await w.push({ branch: "main" });
        await w.commitFile({
            branch: "main",
            path: "a.json",
            content: "3",
            message: "third",
        });
        await w.push({ branch: "main" });

        const c = newClient(http);
        await c.cloneOrOpen(URL_, { depth: 1 });
        expect((await c.log("main", "a.json")).map((l) => l.message)).toEqual([
            "third",
        ]);
        await c.deepen(5);
        expect((await c.log("main", "a.json")).map((l) => l.message)).toEqual([
            "third",
            "second",
            "seed",
        ]);
    });

    it("lists session commits ahead of the default branch and deletes a fetched-only branch", async () => {
        const one = newClient(http);
        await one.cloneOrOpen(URL_);
        for (const content of ["1", "2"]) {
            await one.commitFile({
                branch: "commitcv/a-1",
                path: "a.json",
                content,
                message: `set ${content}`,
            });
        }
        await one.push({ branch: "commitcv/a-1" });
        const base = gitIn(bare, "rev-parse", "main").trim();

        const two = newClient(http);
        await two.cloneOrOpen(URL_);
        const found = await two.sessionCommits("commitcv/a-1");
        expect(found.commits.map((c) => c.message)).toEqual(["set 2", "set 1"]);
        expect(found.baseSha).toBe(base);
        expect(found.headSha).toBe(
            gitIn(bare, "rev-parse", "commitcv/a-1").trim(),
        );
        expect((await two.sessionCommits("main")).commits).toEqual([]);

        await two.deleteRemoteBranch("commitcv/a-1");
        expect(await two.listRemoteBranches("commitcv/")).toEqual([]);
    });

    it("maps a non-fast-forward push to GitConflictError", async () => {
        const one = newClient(http);
        const two = newClient(http);
        await one.cloneOrOpen(URL_);
        await two.cloneOrOpen(URL_);
        await one.commitFile({
            branch: "s",
            path: "a.json",
            content: "1",
            message: "m",
        });
        await one.push({ branch: "s" });
        await two.commitFile({
            branch: "s",
            path: "a.json",
            content: "2",
            message: "m",
        });
        await expect(two.push({ branch: "s" })).rejects.toBeInstanceOf(
            GitConflictError,
        );
        await two.push({ branch: "s", force: true });
        expect(gitIn(bare, "show", "s:a.json")).toBe("2");
    });

    it("maps a wrong token to GitAuthError without leaking it", async () => {
        const c = newClient(http, "wrong-token-123");
        const err = await c.cloneOrOpen(URL_).catch((e) => e);
        expect(err).toBeInstanceOf(GitAuthError);
        expect(err.message).not.toContain("wrong-token-123");
    });
});

describe("GitClient error mapping", () => {
    const failing = (fn: () => never): HttpClient => ({
        request: async () => fn(),
    });

    it("maps 401 and 403 to GitAuthError", async () => {
        for (const statusCode of [401, 403]) {
            const http: HttpClient = {
                request: async ({ url }) => ({
                    url,
                    statusCode,
                    statusMessage: "no",
                    headers: {},
                    body: (async function* () {})(),
                }),
            };
            await expect(
                newClient(http).cloneOrOpen(URL_),
            ).rejects.toBeInstanceOf(GitAuthError);
        }
    });

    it("maps network failures to GitNetworkError and scrubs the token", async () => {
        const http = failing(() => {
            throw new TypeError(`Failed to fetch ${TOKEN}`);
        });
        const err = await newClient(http)
            .cloneOrOpen(URL_)
            .catch((e) => e);
        expect(err).toBeInstanceOf(GitNetworkError);
        expect(err.message).not.toContain(TOKEN);
    });
});
