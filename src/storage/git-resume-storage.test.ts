import { beforeEach, describe, expect, it } from "vitest";
import { createFsFromVolume, Volume } from "memfs";
import type { FsClient, HttpClient } from "isomorphic-git";
import type { IResume } from "@resume/resume";
import { GitClient } from "../git/git-client";
import { bareRepoHttp, gitIn, hasGit, makeBareRepo } from "../git/test-remote";
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
    const storage = (token = TOKEN) =>
        new GitResumeStorage(async () => ({
            url: URL_,
            client: new GitClient({
                fs: createFsFromVolume(new Volume()) as unknown as FsClient,
                http,
                auth: { username: token, password: "x-oauth-basic" },
                author: { name: "Ada", email: "ada@example.com" },
            }),
        }));

    beforeEach(() => {
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
            "update b.json\n",
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

    it("maps a bad token to UnauthorizedError", async () => {
        await expect(storage("nope").list()).rejects.toThrow(UnauthorizedError);
    });
});
