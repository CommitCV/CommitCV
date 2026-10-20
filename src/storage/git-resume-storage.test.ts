import { beforeEach, describe, expect, it } from "vitest";
import { createFsFromVolume, Volume } from "memfs";
import type { FsClient, HttpClient } from "isomorphic-git";
import type { IResume } from "@resume/resume";
import { GitClient } from "../git/git-client";
import { bareRepoHttp, gitIn, hasGit, makeBareRepo } from "../git/test-remote";
import { MemorySessionStore } from "../git/sessions";
import { ConflictError, UnauthorizedError } from "./github-resume-storage";
import { GitResumeStorage } from "./git-resume-storage";

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
    const storage = (token = TOKEN, store = sessions) =>
        new GitResumeStorage(
            async () => ({
                url: URL_,
                client: new GitClient({
                    fs: createFsFromVolume(new Volume()) as unknown as FsClient,
                    http,
                    auth: { username: token, password: "x-oauth-basic" },
                    author: { name: "Ada", email: "ada@example.com" },
                }),
            }),
            { connectionId: "c1", sessions: store },
        );
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
            await storage(TOKEN, new MemorySessionStore()).save(
                "other.json",
                resume("other"),
            );
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
            await storage(TOKEN, new MemorySessionStore()).save(
                "cv.json",
                two("a", "b2"),
            );
            await mine.commit("cv.json", two("a2", "b"));
            expect(JSON.parse(gitIn(bare, "show", "main:cv.json"))).toEqual(
                two("a2", "b2"),
            );
            expect(count("main")).toBe(3);
            expect(sessionBranches()).toBe("");
        });

        describe("when both sides changed the same section", () => {
            const conflict = async () => {
                seedTwo();
                const mine = storage();
                await mine.load("cv.json");
                await mine.saveSession("cv.json", two("mine", "b"));
                await storage(TOKEN, new MemorySessionStore()).save(
                    "cv.json",
                    two("theirs", "b"),
                );
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

    it("maps a bad token to UnauthorizedError", async () => {
        await expect(storage("nope").list()).rejects.toThrow(UnauthorizedError);
    });
});
