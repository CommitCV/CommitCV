import { beforeEach, describe, expect, it } from "vitest";
import { createFsFromVolume, Volume } from "memfs";
import type { FsClient, HttpClient } from "isomorphic-git";
import type { IResume } from "@resume/resume";
import { GitClient } from "../git/git-client";
import { bareRepoHttp, gitIn, hasGit, makeBareRepo } from "../git/test-remote";
import { MemorySessionStore } from "../git/sessions";
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

describe.skipIf(!hasGit)("GitResumeStorage history", () => {
    let bare: string;
    let http: HttpClient;
    // A fresh volume models opening the repo in a new browser (shallow clone).
    const storage = (vol = new Volume()) =>
        new GitResumeStorage(
            async () => ({
                url: URL_,
                client: new GitClient({
                    fs: createFsFromVolume(vol) as unknown as FsClient,
                    http,
                    auth: { username: TOKEN, password: "x-oauth-basic" },
                    author: { name: "Ada", email: "ada@example.com" },
                }),
            }),
            { connectionId: "c1", sessions: new MemorySessionStore() },
        );
    /** Commits v1..vN of h.json, one squashed commit each. */
    const commitVersions = async (n: number) => {
        const s = storage();
        for (let i = 1; i <= n; i++) {
            await s.save("h.json", resume("h", `v${i}`), `version ${i}`);
        }
    };

    beforeEach(() => {
        bare = makeBareRepo({ "note.txt": "x" });
        http = bareRepoHttp(bare, TOKEN);
    });

    it("lists squashed commits newest first with author, date and body", async () => {
        await commitVersions(2);
        const { entries, hasMore } = await storage().history("h.json", {
            limit: 10,
        });
        expect(entries.map((e) => e.message)).toEqual([
            "version 2",
            "version 1",
        ]);
        expect(hasMore).toBe(false);
        expect(entries[0]).toMatchObject({ author: "Ada" });
        expect(entries[0].body).toBeTruthy();
        expect(entries[0].date).toBeGreaterThan(0);
    });

    it("leaves out unsquashed session commits and other files", async () => {
        await commitVersions(1);
        const s = storage();
        await s.saveSession("h.json", resume("h", "draft"));
        await s.save("other.json", resume("o"), "other");
        const { entries } = await s.history("h.json", { limit: 10 });
        expect(entries.map((e) => e.message)).toEqual(["version 1"]);
    });

    it("pages back through shallow history with before, deepening as needed", async () => {
        await commitVersions(5);
        const s = storage();
        const first = await s.history("h.json", { limit: 2 });
        expect(first.entries.map((e) => e.message)).toEqual([
            "version 5",
            "version 4",
        ]);
        expect(first.hasMore).toBe(true);
        const second = await s.history("h.json", {
            limit: 2,
            before: first.entries.at(-1)!.sha,
        });
        expect(second.entries.map((e) => e.message)).toEqual([
            "version 3",
            "version 2",
        ]);
        const third = await s.history("h.json", {
            limit: 2,
            before: second.entries.at(-1)!.sha,
        });
        expect(third.entries.map((e) => e.message)).toEqual(["version 1"]);
        expect(third.hasMore).toBe(false);
    });

    it("has no history before the file was created", async () => {
        await commitVersions(1);
        const { entries } = await storage().history("h.json", { limit: 10 });
        expect(entries).toHaveLength(1);
        expect(
            (await storage().history("missing.json", { limit: 10 })).entries,
        ).toEqual([]);
    });

    it("has no history for a deleted file", async () => {
        await commitVersions(2);
        const s = storage();
        await s.remove("h.json");
        expect(await s.history("h.json", { limit: 10 })).toEqual({
            entries: [],
            hasMore: false,
        });
    });

    it("loads a validated version and caches it by sha", async () => {
        await commitVersions(2);
        const s = storage();
        const { entries } = await s.history("h.json", { limit: 10 });
        const old = await s.loadAt("h.json", entries[1].sha);
        expect(old.sections[0].content[0].text).toBe("v1");
        old.filename = "mutated";
        const again = await s.loadAt("h.json", entries[1].sha);
        expect(again.filename).toBe("h");
        await expect(s.loadAt("nope.json", entries[0].sha)).rejects.toThrow(
            /did not exist/,
        );
    });

    it("reports unreadable versions instead of crashing", async () => {
        const s = storage();
        await s.save("h.json", resume("h"), "ok");
        const w = new Volume();
        const c = new GitClient({
            fs: createFsFromVolume(w) as unknown as FsClient,
            http,
            auth: { username: TOKEN, password: "x-oauth-basic" },
            author: { name: "Ada", email: "ada@example.com" },
        });
        await c.cloneOrOpen(URL_);
        await c.commitFile({
            branch: "main",
            path: "h.json",
            content: JSON.stringify({ schema_version: 99, sections: [] }),
            message: "from the future",
        });
        await c.push({ branch: "main" });
        const { entries } = await storage().history("h.json", { limit: 5 });
        expect(entries[0].message).toBe("from the future");
        await expect(
            storage().loadAt("h.json", entries[0].sha),
        ).rejects.toThrow(/can't be opened/);
        const sha = gitIn(bare, "rev-parse", "main").trim();
        expect(entries[0].sha).toBe(sha);
    });

    it("migrates a legacy file", async () => {
        const legacy = {
            header: { name: "Old", email: "o@x.io", phone: "1" },
            sections: [],
        };
        const bareLegacy = makeBareRepo({
            "h.json": JSON.stringify(legacy),
        });
        http = bareRepoHttp(bareLegacy, TOKEN);
        const s = storage();
        const { entries } = await s.history("h.json", { limit: 5 });
        const loaded = await s.loadAt("h.json", entries[0].sha);
        expect(loaded.schema_version).toBe(1);
    });
});
