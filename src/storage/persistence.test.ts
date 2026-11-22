import { describe, expect, it, vi } from "vitest";
import { persistenceStatus, requestPersistence } from "./persistence";

function manager(persisted: boolean, grant = true) {
    return {
        persisted: vi.fn(async () => persisted),
        persist: vi.fn(async () => grant),
        estimate: vi.fn(async () => ({ usage: 10, quota: 100 })),
    };
}

describe("requestPersistence", () => {
    it("asks the browser when not yet persisted", async () => {
        const m = manager(false);
        expect(await requestPersistence(m)).toBe(true);
        expect(m.persist).toHaveBeenCalledOnce();
    });

    it("reports a refusal", async () => {
        expect(await requestPersistence(manager(false, false))).toBe(false);
    });

    it("does not ask again once persisted", async () => {
        const m = manager(true);
        expect(await requestPersistence(m)).toBe(true);
        expect(m.persist).not.toHaveBeenCalled();
    });

    it("returns false without the Storage API", async () => {
        expect(await requestPersistence(undefined)).toBe(false);
    });

    it("returns false instead of throwing when the browser errors", async () => {
        const m = manager(false);
        m.persist.mockRejectedValue(new Error("denied"));
        expect(await requestPersistence(m)).toBe(false);
    });
});

describe("persistenceStatus", () => {
    it("includes usage and quota", async () => {
        expect(await persistenceStatus(manager(true))).toEqual({
            supported: true,
            persisted: true,
            usage: 10,
            quota: 100,
        });
    });

    it("still reports persistence if estimate fails", async () => {
        const m = manager(false);
        m.estimate.mockRejectedValue(new Error("nope"));
        expect(await persistenceStatus(m)).toMatchObject({
            supported: true,
            persisted: false,
            usage: undefined,
        });
    });

    it("reports unsupported without the Storage API", async () => {
        expect(await persistenceStatus(undefined)).toEqual({
            supported: false,
            persisted: false,
        });
    });
});
