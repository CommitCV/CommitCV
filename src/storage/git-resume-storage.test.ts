import { beforeEach, describe, expect, it } from "vitest";
import { createFsFromVolume, Volume } from "memfs";
import type { FsClient, HttpClient } from "isomorphic-git";
import type { IResume } from "@resume/resume";
import { GitClient } from "../git/git-client";
import { bareRepoHttp, gitIn, hasGit, makeBareRepo } from "../git/test-remote";
import { MemorySessionStore } from "../git/sessions";
import { ConflictError, UnauthorizedError } from "./github-resume-storage";
import {
    GitResumeStorage,
    SessionDivergedError,
    type ISessionInfo,
} from "./git-resume-storage";

const URL_ = "https://git.example.com/me/resumes";
const TOKEN = "tok";
const resume = (filename: string, note = "hi"): IResume => ({
    filename,
    date: "01-01-26",
    schema_version: 1,
    sections: [
        {
            title: "T",
            type: "header",
            toggled: true,
            content: [{ text: note, flags: [], toggled: true }],
            subsections: [],
        },
    ],
});

describe.skipIf(!hasGit)("GitResumeStorage", () => {
    let bare: string;
    let http: HttpClient;
    let sessions: MemorySessionStore;
    // Passing the same `vol` again models reopening in the same browser.
    const storage = (token = TOKEN, store = sessions, vol = new Volume()) =>
        new GitResumeStorage(
            async () => ({
                url: URL_,
                client: new GitClient({
                    fs: createFsFromVolume(vol) as unknown as FsClient,
                    http,
                    auth: { username: token, password: "x-oauth-basic" },
                    author: { name: "Ada", email: "ada@example.com" },
                }),
            }),
            { connectionId: "c1", sessions: store },
        );
    /** Another device: it loads the file before it saves a change. */
    const otherDevice = async (path: string, next: IResume) => {
        const device = storage(TOKEN, new MemorySessionStore());
        await device.load(path).catch(() => undefined); // a new file
        await device.save(path, next);
    };
    const sessionBranches = () =>
        gitIn(bare, "branch", "--list", "commitcv/*").trim();
    const count = (ref: string) =>
        Number(gitIn(bare, "rev-list", "--count", ref).trim());

    beforeEach(() => {
        sessions = new MemorySessionStore();
        bare = makeBareRepo({
            "a.json": JSON.stringify(resume("a")),
            "note.txt": "x",
        });
        http = bareRepoHttp(bare, TOKEN);
    });

    it("lists json files and loads one, validating it", async () => {
        const s = storage();
        expect(await s.list()).toEqual([
            { id: "a.json", filename: "a", date: "" },
        ]);
        expect((await s.load("a.json")).filename).toBe("a");
        await expect(s.load("missing.json")).rejects.toThrow(/not found/);
    });

    it("commits to the default branch with the message and pushes", async () => {
        const s = storage();
        await s.save("b.json", resume("b"), "add b");
        expect(JSON.parse(gitIn(bare, "show", "main:b.json")).filename).toBe(
            "b",
        );
        expect(gitIn(bare, "log", "-1", "--format=%an|%cn|%s", "main")).toBe(
            "Ada|CommitCV|add b\n",
        );
        await s.save("b.json", resume("b", "again"));
        expect(gitIn(bare, "log", "-1", "--format=%s", "main")).toBe(
            "update header\n",
        );
    });

    it("removes a file with a commit", async () => {
        const s = storage();
        await s.remove("a.json");
        expect(gitIn(bare, "ls-tree", "--name-only", "main")).toBe(
            "note.txt\n",
        );
        expect(gitIn(bare, "log", "-1", "--format=%s", "main")).toBe(
            "delete a.json\n",
        );
    });

    it("throws ConflictError when the file changed remotely since it was read", async () => {
        const mine = storage();
        const theirs = storage();
        await mine.load("a.json");
        await theirs.save("a.json", resume("a", "theirs"));
        await expect(mine.save("a.json", resume("a", "mine"))).rejects.toThrow(
            ConflictError,
        );
        // Reloading clears the conflict.
        await mine.load("a.json");
        await mine.save("a.json", resume("a", "mine"));
        expect(gitIn(bare, "show", "main:a.json")).toContain("mine");
    });

    describe("sessions", () => {
        const section = (title: string, text: string) => ({
            title,
            type: "full-text" as const,
            toggled: true,
            content: [{ text, flags: [], toggled: true }],
            subsections: [],
        });
        const two = (a: string, b: string): IResume => ({
            filename: "cv",
            date: "01-01-26",
            schema_version: 1,
            sections: [section("Alpha", a), section("Beta", b)],
        });
        const seedTwo = () => {
            bare = makeBareRepo({
                "cv.json": JSON.stringify(two("a", "b"), null, 4),
            });
            http = bareRepoHttp(bare, TOKEN);
        };
        const main = () => gitIn(bare, "rev-parse", "main").trim();
        const branch = () => sessionBranches().replace(/^\*?\s*/, "");

        it("first autosave creates a session branch, leaving main alone", async () => {
            seedTwo();
            const before = main();
            const s = storage();
            await s.load("cv.json");
            await s.saveSession("cv.json", two("a2", "b"));
            expect(main()).toBe(before);
            expect(branch()).toMatch(/^commitcv\/cv-[0-9a-f]{8}$/);
            expect(
                gitIn(bare, "log", "-1", "--format=%an|%cn|%s|%b", branch()),
            ).toBe(
                'Ada|CommitCV|update alpha: edit 1 entry|- alpha: edited "a2" (line 1)\n\n',
            );
            const [row] = await sessions.list("c1");
            expect(row).toMatchObject({
                path: "cv.json",
                branch: branch(),
                baseSha: before,
                lastPushedSha: expect.stringMatching(/^[0-9a-f]{40}$/),
            });
        });

        it("does nothing for unchanged content and adds commits for edits", async () => {
            seedTwo();
            const s = storage();
            await s.load("cv.json");
            await s.saveSession("cv.json", two("a", "b"));
            expect(sessionBranches()).toBe("");
            await s.saveSession("cv.json", two("a2", "b"));
            await s.saveSession("cv.json", two("a2", "b"));
            await s.saveSession("cv.json", two("a2", "b2"));
            expect(count(branch())).toBe(3);
            expect(gitIn(bare, "log", "-1", "--format=%s", branch())).toBe(
                "update beta: edit 1 entry\n",
            );
            expect(await sessions.list()).toHaveLength(1);
        });

        it("squashes to one default-branch commit and deletes the session", async () => {
            seedTwo();
            const s = storage();
            await s.load("cv.json");
            await s.saveSession("cv.json", two("a2", "b"));
            await s.saveSession("cv.json", two("a2", "b2"));
            const before = main();
            await s.commit("cv.json", two("a2", "b2"));
            expect(count("main")).toBe(2);
            expect(gitIn(bare, "rev-parse", "main^").trim()).toBe(before);
            expect(JSON.parse(gitIn(bare, "show", "main:cv.json"))).toEqual(
                two("a2", "b2"),
            );
            expect(
                gitIn(bare, "log", "-1", "--format=%an|%cn|%s", "main"),
            ).toBe("Ada|CommitCV|update alpha, beta\n");
            expect(sessionBranches()).toBe("");
            expect(await sessions.list()).toEqual([]);
        });

        describe("after another device pushes", () => {
            const theirs = async (alpha = "a2") => {
                const other = storage(TOKEN, new MemorySessionStore());
                await other.load("cv.json");
                await other.commit("cv.json", two(alpha, "b-theirs"));
            };
            const onMain = () => gitIn(bare, "show", "main:cv.json");

            it("a commit keeps their edit", async () => {
                seedTwo();
                const mine = storage();
                await mine.load("cv.json");
                await mine.commit("cv.json", two("a2", "b"));
                await theirs();
                await mine.commit("cv.json", two("a3", "b")); // merges, never drops b-theirs
                expect(JSON.parse(onMain())).toEqual(two("a3", "b-theirs"));
            });

            it("an autosave then a commit keeps their edit", async () => {
                seedTwo();
                const mine = storage();
                await mine.load("cv.json");
                await mine.commit("cv.json", two("a2", "b"));
                await theirs();
                await mine.saveSession("cv.json", two("a3", "b"));
                await mine.commit("cv.json", two("a3", "b"));
                expect(JSON.parse(onMain())).toEqual(two("a3", "b-theirs"));
            });

            it("a commit that merged their edit still keeps it next time", async () => {
                seedTwo();
                const mine = storage();
                await mine.load("cv.json");
                await theirs("a");
                // The editor never saw b-theirs, so this commit merges it in.
                await mine.commit("cv.json", two("a2", "b"));
                expect(JSON.parse(onMain())).toEqual(two("a2", "b-theirs"));
                await mine.commit("cv.json", two("a3", "b"));
                expect(JSON.parse(onMain())).toEqual(two("a3", "b-theirs"));
            });

            it("a commit after discarding the session keeps their edit", async () => {
                seedTwo();
                const mine = storage();
                await mine.load("cv.json");
                await mine.saveSession("cv.json", two("a2", "b"));
                await mine.discardSession("cv.json");
                await theirs("a");
                await mine.commit("cv.json", two("a3", "b"));
                expect(JSON.parse(onMain())).toEqual(two("a3", "b-theirs"));
            });
        });

        it("commits without a prior autosave and a no-change commit is a no-op", async () => {
            seedTwo();
            const s = storage();
            const before = main();
            await s.commit("cv.json", two("a", "b"));
            expect(main()).toBe(before);
            await s.commit("cv.json", two("a2", "b"), { message: "custom" });
            expect(gitIn(bare, "log", "-1", "--format=%s", "main")).toBe(
                "custom\n",
            );
            expect(sessionBranches()).toBe("");
        });

        it("squashes onto a default branch that moved in another file", async () => {
            seedTwo();
            const mine = storage();
            await mine.load("cv.json");
            await mine.saveSession("cv.json", two("a2", "b"));
            await otherDevice("other.json", resume("other"));
            const moved = main();
            await mine.commit("cv.json", two("a2", "b"));
            expect(gitIn(bare, "rev-parse", "main^").trim()).toBe(moved);
            expect(
                gitIn(bare, "ls-tree", "--name-only", "main")
                    .trim()
                    .split("\n"),
            ).toEqual(["cv.json", "other.json"]);
            expect(JSON.parse(gitIn(bare, "show", "main:cv.json"))).toEqual(
                two("a2", "b"),
            );
        });

        it("merges changes to different sections of the same file", async () => {
            seedTwo();
            const mine = storage();
            await mine.load("cv.json");
            await mine.saveSession("cv.json", two("a2", "b"));
            await otherDevice("cv.json", two("a", "b2"));
            await mine.commit("cv.json", two("a2", "b"));
            expect(JSON.parse(gitIn(bare, "show", "main:cv.json"))).toEqual(
                two("a2", "b2"),
            );
            expect(count("main")).toBe(3);
            expect(sessionBranches()).toBe("");
        });

        describe("a draft restored after a reload (no load() call)", () => {
            const restored = async () => {
                seedTwo();
                // The git filesystem persists across a reload, like the base.
                const vol = new Volume();
                await storage(TOKEN, sessions, vol).load("cv.json");
                // The tab reloads before the first autosave: no session row.
                expect(await sessions.list()).toEqual([]);
                return storage(TOKEN, sessions, vol);
            };

            it("raises the conflict prompt when the same section moved", async () => {
                const mine = await restored();
                await otherDevice("cv.json", two("theirs", "b"));
                await expect(
                    mine.commit("cv.json", two("mine", "b")),
                ).rejects.toThrow(ConflictError);
                expect(JSON.parse(gitIn(bare, "show", "main:cv.json"))).toEqual(
                    two("theirs", "b"),
                );
            });

            it("merges instead of reverting the other device's change", async () => {
                const mine = await restored();
                await otherDevice("cv.json", two("a", "theirs"));
                await mine.commit("cv.json", two("mine", "b"));
                expect(JSON.parse(gitIn(bare, "show", "main:cv.json"))).toEqual(
                    two("mine", "theirs"),
                );
            });

            it("starts a session on autosave from the saved base", async () => {
                const mine = await restored();
                await otherDevice("cv.json", two("a", "theirs"));
                await mine.saveSession("cv.json", two("mine", "b"));
                const [session] = await sessions.list();
                expect(session.baseSha).toBe(
                    await sessions.getBase("c1", "cv.json"),
                );
            });

            it("treats an unknown base as a conflict, not as the head", async () => {
                seedTwo();
                const fresh = storage();
                await fresh.saveSession("cv.json", two("mine", "b"));
                expect(await sessions.list()).toEqual([]);
                await expect(
                    fresh.commit("cv.json", two("mine", "b")),
                ).rejects.toThrow(ConflictError);
            });
        });

        describe("when both sides changed the same section", () => {
            const conflict = async () => {
                seedTwo();
                const mine = storage();
                await mine.load("cv.json");
                await mine.saveSession("cv.json", two("mine", "b"));
                await otherDevice("cv.json", two("theirs", "b"));
                await expect(
                    mine.commit("cv.json", two("mine", "b")),
                ).rejects.toThrow(ConflictError);
                // The session survives so the user can resolve.
                expect(await sessions.list()).toHaveLength(1);
                expect(sessionBranches()).not.toBe("");
                return mine;
            };

            it("keep mine overwrites the default branch version", async () => {
                const mine = await conflict();
                await mine.commit("cv.json", two("mine", "b"), {
                    force: true,
                });
                expect(JSON.parse(gitIn(bare, "show", "main:cv.json"))).toEqual(
                    two("mine", "b"),
                );
                expect(count("main")).toBe(3);
                expect(sessionBranches()).toBe("");
                expect(await sessions.list()).toEqual([]);
            });

            it("take remote drops the session and returns the default content", async () => {
                const mine = await conflict();
                const theirs = await mine.discardSession("cv.json");
                expect(theirs).toEqual(two("theirs", "b"));
                expect(sessionBranches()).toBe("");
                expect(await sessions.list()).toEqual([]);
                expect(count("main")).toBe(2);
            });
        });
    });

    describe("resuming sessions", () => {
        const section = (title: string, text: string) => ({
            title,
            type: "full-text" as const,
            toggled: true,
            content: [{ text, flags: [], toggled: true }],
            subsections: [],
        });
        const two = (a: string, b: string): IResume => ({
            filename: "cv",
            date: "01-01-26",
            schema_version: 1,
            sections: [section("Alpha", a), section("Beta", b)],
        });
        const flaky = { pushFails: false };
        const count = (ref: string) =>
            Number(gitIn(bare, "rev-list", "--count", ref).trim());
        const branches = () =>
            gitIn(
                bare,
                "for-each-ref",
                "--format=%(refname:short)",
                "refs/heads/commitcv/",
            )
                .trim()
                .split("\n")
                .filter(Boolean);
        const showOn = (ref: string) =>
            JSON.parse(gitIn(bare, "show", `${ref}:cv.json`)) as IResume;
        const first = async (s: GitResumeStorage, path = "cv.json") => {
            const [info] = await s.findSessions(path);
            return info as ISessionInfo;
        };

        beforeEach(() => {
            flaky.pushFails = false;
            bare = makeBareRepo({
                "cv.json": JSON.stringify(two("a", "b"), null, 4),
                "other.json": JSON.stringify(resume("other"), null, 4),
            });
            const inner = bareRepoHttp(bare, TOKEN);
            http = {
                request: (req) => {
                    if (flaky.pushFails && req.url.includes("receive-pack")) {
                        throw new TypeError("Failed to fetch");
                    }
                    return inner.request(req);
                },
            };
        });

        /** Another device pushes to the default branch (loading the file first). */
        const pushToMain = async (next: IResume) => {
            const device = storage(TOKEN, new MemorySessionStore());
            await device.load("cv.json");
            await device.save("cv.json", next);
        };

        /** Another browser starts a session on cv.json. */
        const otherDevice = async (a = "a2", b = "b") => {
            const other = storage(TOKEN, new MemorySessionStore());
            await other.load("cv.json");
            await other.load("cv.json");
            await other.saveSession("cv.json", two(a, b));
            return other;
        };

        it("finds nothing without a session", async () => {
            expect(await storage().findSessions("cv.json")).toEqual([]);
            expect(await storage().listSessions()).toEqual([]);
        });

        it("finds a session another client started", async () => {
            await otherDevice();
            const info = await first(storage(TOKEN, new MemorySessionStore()));
            expect(info).toMatchObject({
                path: "cv.json",
                branch: branches()[0],
                headSha: gitIn(bare, "rev-parse", branches()[0]).trim(),
                baseSha: gitIn(bare, "rev-parse", "main").trim(),
                aheadBy: 1,
                lastCommit: { message: "update alpha: edit 1 entry" },
            });
            expect(info.local).toBeUndefined();
            expect(typeof info.lastCommit.date).toBe("number");
        });

        it("ignores sessions of other files and branches that change nothing", async () => {
            const o = storage(TOKEN, new MemorySessionStore());
            await o.load("other.json");
            await o.saveSession("other.json", resume("other", "edited"));
            gitIn(bare, "branch", "commitcv/cv-deadbeef", "main");
            const s = storage(TOKEN, new MemorySessionStore());
            expect(await s.findSessions("cv.json")).toEqual([]);
            expect(await s.findSessions("other.json")).toHaveLength(1);
            expect((await s.listSessions()).map((i) => i.path)).toEqual([
                "other.json",
            ]);
        });

        it("lists several sessions of one file by last activity", async () => {
            await otherDevice("old", "b");
            await new Promise((r) => setTimeout(r, 1100));
            const newer = storage(TOKEN, new MemorySessionStore());
            await newer.load("cv.json");
            await newer.saveSession("cv.json", two("a", "new"));
            const found = await storage().findSessions("cv.json");
            expect(found).toHaveLength(2);
            expect(found[0].lastCommit.message).toBe(
                "update beta: edit 1 entry",
            );
            expect(found[0].lastCommit.date).toBeGreaterThan(
                found[1].lastCommit.date,
            );
        });

        it("continues on another client: autosaves fast-forward, squash works", async () => {
            await otherDevice();
            const branch = branches()[0];
            const s = storage(TOKEN, new MemorySessionStore());
            const info = await first(s);
            const opened = await s.inspectSession("cv.json", info);
            expect(opened).toEqual({
                remote: two("a2", "b"),
                local: null,
                diverged: false,
            });
            expect(await s.resolveSession("cv.json", info, "remote")).toEqual(
                two("a2", "b"),
            );
            await s.load("cv.json");
            await s.saveSession("cv.json", two("a2", "b2"));
            expect(branches()).toEqual([branch]);
            expect(count(branch)).toBe(3);
            await s.commit("cv.json", two("a2", "b2"));
            expect(count("main")).toBe(2);
            expect(showOn("main")).toEqual(two("a2", "b2"));
            expect(branches()).toEqual([]);
        });

        it("offers unpushed local edits and pushes them on request", async () => {
            const store = new MemorySessionStore();
            const vol = new Volume();
            const s = storage(TOKEN, store, vol);
            await s.load("cv.json");
            await s.saveSession("cv.json", two("a2", "b"));
            flaky.pushFails = true;
            await expect(
                s.saveSession("cv.json", two("a3", "b")),
            ).rejects.toThrow();
            flaky.pushFails = false;
            const reopened = storage(TOKEN, store, vol);
            const info = await first(reopened);
            const opened = await reopened.inspectSession("cv.json", info);
            expect(opened.remote).toEqual(two("a2", "b"));
            expect(opened.local).toEqual(two("a3", "b"));
            expect(opened.diverged).toBe(false);
            expect(
                await reopened.resolveSession("cv.json", info, "mine"),
            ).toEqual(two("a3", "b"));
            expect(showOn(branches()[0])).toEqual(two("a3", "b"));
            expect((await store.list())[0].lastContent).toBeUndefined();
        });

        it("using the session as saved drops unpushed local edits", async () => {
            const store = new MemorySessionStore();
            const vol = new Volume();
            const s = storage(TOKEN, store, vol);
            await s.load("cv.json");
            await s.saveSession("cv.json", two("a2", "b"));
            flaky.pushFails = true;
            await s.saveSession("cv.json", two("a3", "b")).catch(() => {});
            flaky.pushFails = false;
            const reopened = storage(TOKEN, store, vol);
            const info = await first(reopened);
            await reopened.resolveSession("cv.json", info, "remote");
            await reopened.saveSession("cv.json", two("a2", "b4"));
            expect(showOn(branches()[0])).toEqual(two("a2", "b4"));
            expect(count(branches()[0])).toBe(3);
        });

        it("finds and pushes a session whose first push failed", async () => {
            const store = new MemorySessionStore();
            const vol = new Volume();
            const s = storage(TOKEN, store, vol);
            flaky.pushFails = true;
            await s.load("cv.json");
            await s.saveSession("cv.json", two("a2", "b")).catch(() => {});
            flaky.pushFails = false;
            expect(branches()).toEqual([]);
            const reopened = storage(TOKEN, store, vol);
            const info = await first(reopened);
            expect(info.local?.lastPushedSha).toBeNull();
            await reopened.resolveSession("cv.json", info, "remote");
            expect(showOn(branches()[0])).toEqual(two("a2", "b"));
        });

        describe("when another device pushed the session meanwhile", () => {
            const diverge = async () => {
                const mine = storage();
                await mine.load("cv.json");
                await mine.saveSession("cv.json", two("a2", "b"));
                const branch = branches()[0];
                const other = storage(TOKEN, new MemorySessionStore());
                const info = await first(other);
                await other.resolveSession("cv.json", info, "remote");
                await other.load("cv.json");
                await other.saveSession("cv.json", two("theirs", "b"));
                return { mine, branch, other };
            };

            it("never overwrites silently", async () => {
                const { mine, branch } = await diverge();
                const theirs = gitIn(bare, "rev-parse", branch).trim();
                await expect(
                    mine.saveSession("cv.json", two("a3", "b")),
                ).rejects.toThrow(SessionDivergedError);
                await expect(
                    mine.saveSession("cv.json", two("a3", "b")),
                ).rejects.toThrow(SessionDivergedError);
                expect(gitIn(bare, "rev-parse", branch).trim()).toBe(theirs);
                const info = await first(mine);
                expect(
                    (await mine.inspectSession("cv.json", info)).diverged,
                ).toBe(true);
            });

            it("keep mine force-pushes only when asked", async () => {
                const { mine, branch } = await diverge();
                await mine
                    .saveSession("cv.json", two("a3", "b"))
                    .catch(() => {});
                expect(showOn(branch)).toEqual(two("theirs", "b"));
                await mine.load("cv.json");
                await mine.saveSession("cv.json", two("a3", "b"), {
                    force: true,
                });
                expect(showOn(branch)).toEqual(two("a3", "b"));
                await mine.saveSession("cv.json", two("a3", "b2"));
                expect(showOn(branch)).toEqual(two("a3", "b2"));
            });

            it("use remote adopts their version and resumes pushing", async () => {
                const { mine, branch } = await diverge();
                const info = await first(mine);
                expect(
                    await mine.resolveSession("cv.json", info, "remote"),
                ).toEqual(two("theirs", "b"));
                await mine.load("cv.json");
                await mine.saveSession("cv.json", two("theirs", "b2"));
                expect(showOn(branch)).toEqual(two("theirs", "b2"));
                expect(count(branch)).toBe(4);
            });

            it("keep mine from the open prompt uses the local version", async () => {
                const { mine, branch } = await diverge();
                const info = await first(mine);
                expect(
                    await mine.resolveSession("cv.json", info, "mine"),
                ).toEqual(two("a2", "b"));
                expect(showOn(branch)).toEqual(two("a2", "b"));
            });
        });

        describe("discard", () => {
            it("deletes a session found on the remote and loads default content", async () => {
                await otherDevice();
                const s = storage(TOKEN, new MemorySessionStore());
                const info = await first(s);
                expect(await s.discardSession("cv.json", info.branch)).toEqual(
                    two("a", "b"),
                );
                expect(branches()).toEqual([]);
                expect(await s.findSessions("cv.json")).toEqual([]);
                expect(count("main")).toBe(1);
            });

            it("also clears this browser's record", async () => {
                const store = new MemorySessionStore();
                const s = storage(TOKEN, store);
                await s.load("cv.json");
                await s.saveSession("cv.json", two("a2", "b"));
                const info = await first(s);
                await s.discardSession("cv.json", info.branch);
                expect(branches()).toEqual([]);
                expect(await store.list()).toEqual([]);
            });
        });

        it("drops a stale record when the session was squashed elsewhere", async () => {
            const store = new MemorySessionStore();
            const starter = storage(TOKEN, store);
            await starter.load("cv.json");
            await starter.saveSession("cv.json", two("a2", "b"));
            const other = storage(TOKEN, new MemorySessionStore());
            await other.resolveSession("cv.json", await first(other), "remote");
            await other.commit("cv.json", two("a2", "b"));
            const s = storage(TOKEN, store);
            expect(await s.findSessions("cv.json")).toEqual([]);
            expect(await store.list()).toEqual([]);
        });

        describe("after the default branch moved", () => {
            it("continues and squash merges changes to other sections", async () => {
                await otherDevice("a2", "b");
                await pushToMain(two("a", "b2"));
                const s = storage(TOKEN, new MemorySessionStore());
                const info = await first(s);
                expect(info.baseSha).not.toBe(
                    gitIn(bare, "rev-parse", "main").trim(),
                );
                const mine = await s.resolveSession("cv.json", info, "remote");
                await s.commit("cv.json", mine);
                expect(showOn("main")).toEqual(two("a2", "b2"));
                expect(branches()).toEqual([]);
            });

            it("squash reports a conflict and keeps the session", async () => {
                await otherDevice("mine", "b");
                await pushToMain(two("theirs", "b"));
                const store = new MemorySessionStore();
                const s = storage(TOKEN, store);
                const info = await first(s);
                const mine = await s.resolveSession("cv.json", info, "remote");
                await expect(s.commit("cv.json", mine)).rejects.toThrow(
                    ConflictError,
                );
                expect(branches()).toEqual([info.branch]);
                expect(await store.list()).toHaveLength(1);
                await s.commit("cv.json", mine, { force: true });
                expect(showOn("main")).toEqual(two("mine", "b"));
            });
        });
    });

    it("maps a bad token to UnauthorizedError", async () => {
        await expect(storage("nope").list()).rejects.toThrow(UnauthorizedError);
    });
});
