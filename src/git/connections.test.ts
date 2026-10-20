import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { IdbResumeStorage } from "../storage/idb-resume-storage";
import { ConnectionStore, type TNewConnection } from "./connections";

const draft: TNewConnection = {
    url: "https://github.com/me/cv",
    provider: "github",
    label: "Mine",
    token: "ghp_secret",
    author: { name: "Ada", email: "ada@example.com" },
};

describe("ConnectionStore", () => {
    it("adds, gets, lists and removes connections", async () => {
        const store = new ConnectionStore(new IDBFactory());
        expect(await store.list()).toEqual([]);
        const a = await store.add(draft);
        const b = await store.add({ ...draft, label: "Other" });
        expect(a.id).not.toBe(b.id);
        expect(await store.get(a.id)).toEqual({ ...draft, id: a.id });
        expect((await store.list()).map((c) => c.label).sort()).toEqual([
            "Mine",
            "Other",
        ]);
        await store.remove(a.id);
        expect(await store.get(a.id)).toBeUndefined();
        expect(await store.list()).toHaveLength(1);
    });

    it("upgrades a v2 database without losing resumes or thumbnails", async () => {
        const factory = new IDBFactory();
        await new Promise<void>((resolve, reject) => {
            const req = factory.open("commitcv", 2);
            req.onupgradeneeded = () => {
                req.result.createObjectStore("resumes", { keyPath: "id" });
                req.result.createObjectStore("thumbnails", { keyPath: "id" });
                req.transaction!.objectStore("resumes").put({
                    id: "r",
                    resume: {
                        filename: "old",
                        date: "01-01-26",
                        schema_version: 1,
                        sections: [],
                    },
                    updatedAt: 1,
                });
            };
            req.onsuccess = () => {
                req.result.close();
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
        const store = new ConnectionStore(factory);
        await store.add(draft);
        const entries = await new IdbResumeStorage(factory).list();
        expect(entries.map((e) => e.filename)).toEqual(["old"]);
    });
});
