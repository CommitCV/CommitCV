import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import type { IResume } from "@resume/resume";
import { IdbResumeStorage } from "./idb-resume-storage";
import type { IResumeEntry, IResumeStorage } from "./resume-storage";

function makeResume(filename: string, note: string): IResume {
    return {
        filename,
        date: "02-26-26",
        schema_version: 1,
        sections: [
            {
                title: "Travis",
                type: "header",
                toggled: true,
                content: [{ text: note, flags: [], toggled: true }],
                subsections: [],
            },
        ],
    };
}

/** A legacy store whose load can be made to fail for chosen ids. */
function fakeLegacy(
    resumes: Record<string, IResume>,
    unreadable: string[] = [],
): IResumeStorage {
    return {
        async list(): Promise<IResumeEntry[]> {
            return Object.entries(resumes).map(([id, r]) => ({
                id,
                filename: r.filename,
                date: r.date,
            }));
        },
        async load(id) {
            if (unreadable.includes(id)) throw new Error("corrupt");
            return resumes[id];
        },
        async save() {},
        async remove(id) {
            delete resumes[id];
        },
    };
}

describe("IdbResumeStorage", () => {
    it("round-trips save, list, load and remove", async () => {
        const storage = new IdbResumeStorage(new IDBFactory());
        await storage.save("a", makeResume("one", "first"));
        await storage.save("b", makeResume("two", "second"));

        const entries = await storage.list();
        expect(entries.map((e) => e.filename).sort()).toEqual(["one", "two"]);
        expect((await storage.load("a")).filename).toBe("one");

        await storage.remove("a");
        expect((await storage.list()).map((e) => e.id)).toEqual(["b"]);
        await expect(storage.load("a")).rejects.toThrow(/no saved resume/);
    });

    it("records when each resume was last saved", async () => {
        const storage = new IdbResumeStorage(new IDBFactory());
        const before = Date.now();
        await storage.save("a", makeResume("one", "first"));
        const [entry] = await storage.list();
        expect(entry.updatedAt).toBeGreaterThanOrEqual(before);

        await new Promise((r) => setTimeout(r, 5));
        await storage.save("a", makeResume("one", "edited"));
        const [after] = await storage.list();
        expect(after.updatedAt!).toBeGreaterThan(entry.updatedAt!);
    });

    it("persists across instances sharing a database", async () => {
        const factory = new IDBFactory();
        await new IdbResumeStorage(factory).save("a", makeResume("one", "x"));
        const reopened = new IdbResumeStorage(factory);
        expect((await reopened.load("a")).filename).toBe("one");
    });

    it("moves legacy resumes over and removes them from the old store", async () => {
        const legacy = fakeLegacy({ old: makeResume("legacy", "from ls") });
        const storage = new IdbResumeStorage(new IDBFactory(), legacy);

        expect((await storage.list()).map((e) => e.id)).toEqual(["old"]);
        expect((await storage.load("old")).filename).toBe("legacy");
        expect(await legacy.list()).toEqual([]);
    });

    it("leaves a legacy resume that can't be read in place", async () => {
        const legacy = fakeLegacy(
            { good: makeResume("good", "ok"), bad: makeResume("bad", "no") },
            ["bad"],
        );
        const storage = new IdbResumeStorage(new IDBFactory(), legacy);

        expect((await storage.list()).map((e) => e.id)).toEqual(["good"]);
        expect((await legacy.list()).map((e) => e.id)).toEqual(["bad"]);
    });

    it("does not overwrite a newer saved resume when migrating twice", async () => {
        const factory = new IDBFactory();
        const legacy = fakeLegacy({ a: makeResume("legacy", "old") });
        await new IdbResumeStorage(factory, legacy).list();
        await new IdbResumeStorage(factory).save("a", makeResume("new", "n"));

        // Legacy is empty now, so a fresh instance migrates nothing.
        const again = new IdbResumeStorage(factory, legacy);
        expect((await again.load("a")).filename).toBe("new");
    });

    it("keeps the IndexedDB copy and drops the legacy one when both exist", async () => {
        const factory = new IDBFactory();
        await new IdbResumeStorage(factory).save("a", makeResume("newer", "n"));
        const legacy = fakeLegacy({ a: makeResume("older", "o") });

        const storage = new IdbResumeStorage(factory, legacy);
        expect((await storage.load("a")).filename).toBe("newer");
        expect(await legacy.list()).toEqual([]);
    });

    it("retries the migration after it failed", async () => {
        const inner = fakeLegacy({ a: makeResume("legacy", "x") });
        let failures = 1;
        const legacy: IResumeStorage = {
            ...inner,
            async list() {
                if (failures-- > 0) throw new Error("storage unavailable");
                return inner.list();
            },
        };
        const storage = new IdbResumeStorage(new IDBFactory(), legacy);

        await expect(storage.list()).rejects.toThrow(/unavailable/);
        expect((await storage.list()).map((e) => e.id)).toEqual(["a"]);
    });

    it("retries opening the database after it failed", async () => {
        const real = new IDBFactory();
        let failures = 1;
        const flaky = {
            open(name: string, version?: number) {
                if (failures-- <= 0) return real.open(name, version);
                const req = {
                    error: new Error("blocked"),
                } as unknown as IDBOpenDBRequest;
                setTimeout(() => req.onerror?.(new Event("error")));
                return req;
            },
        } as unknown as IDBFactory;
        const storage = new IdbResumeStorage(flaky);

        await expect(storage.list()).rejects.toThrow(/blocked/);
        expect(await storage.list()).toEqual([]);
    });
});
