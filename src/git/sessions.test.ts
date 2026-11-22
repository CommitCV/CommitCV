import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { IdbResumeStorage } from "../storage/idb-resume-storage";
import { ConnectionStore } from "./connections";
import { SessionStore, type ISession } from "./sessions";

const session = (over: Partial<ISession> = {}): ISession => ({
    connectionId: "c1",
    path: "a.json",
    branch: "commitcv/a-1234",
    baseSha: "b".repeat(40),
    headSha: null,
    lastPushedSha: null,
    startedAt: 1,
    ...over,
});

describe("SessionStore", () => {
    it("puts, gets, lists and deletes by connection and path", async () => {
        const store = new SessionStore(new IDBFactory());
        expect(await store.get("c1", "a.json")).toBeUndefined();
        await store.put(session());
        await store.put(session({ path: "b.json", branch: "x" }));
        await store.put(session({ connectionId: "c2" }));
        expect((await store.get("c1", "a.json"))?.branch).toBe(
            "commitcv/a-1234",
        );
        expect(await store.list("c1")).toHaveLength(2);
        expect(await store.list()).toHaveLength(3);
        await store.put(session({ lastPushedSha: "f".repeat(40) }));
        expect((await store.get("c1", "a.json"))?.lastPushedSha).toBe(
            "f".repeat(40),
        );
        await store.delete("c1", "a.json");
        expect(await store.get("c1", "a.json")).toBeUndefined();
        expect(await store.get("c2", "a.json")).toBeDefined();
    });

    it("upgrades a v3 database keeping resumes and connections", async () => {
        const factory = new IDBFactory();
        await new Promise<void>((resolve, reject) => {
            const req = factory.open("commitcv", 3);
            req.onupgradeneeded = () => {
                for (const n of ["resumes", "thumbnails", "connections"]) {
                    req.result.createObjectStore(n, { keyPath: "id" });
                }
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
                req.transaction!.objectStore("connections").put({
                    id: "k",
                    label: "kept",
                });
            };
            req.onsuccess = () => {
                req.result.close();
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
        const store = new SessionStore(factory);
        await store.put(session());
        expect(await store.list()).toHaveLength(1);
        const entries = await new IdbResumeStorage(factory).list();
        expect(entries.map((e) => e.filename)).toEqual(["old"]);
        expect((await new ConnectionStore(factory).list()).length).toBe(1);
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
        const store = new SessionStore(flaky);

        await expect(store.list()).rejects.toThrow(/blocked/);
        expect(await store.list()).toEqual([]);
    });
});
