import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { DB_NAME, openDb } from "./db";

describe("openDb", () => {
    it("closes on a version change so a newer tab's upgrade is not blocked", async () => {
        const factory = new IDBFactory();
        const onStale = vi.fn();
        await openDb(factory, onStale);
        const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = factory.open(DB_NAME, 99);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            req.onblocked = () => reject(new Error("upgrade was blocked"));
        });
        expect(upgraded.version).toBe(99);
        expect(onStale).toHaveBeenCalledOnce();
    });
});
