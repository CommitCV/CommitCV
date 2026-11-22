import { describe, expect, it } from "vitest";
import { ago, syncLabel } from "./sync-label";

const idle = { phase: "idle", autosavedAt: null } as const;

describe("syncLabel", () => {
    it("describes each state", () => {
        expect(syncLabel("dirty", idle, 0)).toBe("Unsaved changes");
        expect(syncLabel("clean", idle, 0)).toBe("Saved");
        expect(syncLabel("error", idle, 0)).toBe("Save failed");
        expect(syncLabel("saving", idle, 0)).toBe("Saving…");
        expect(syncLabel("dirty", { ...idle, phase: "syncing" }, 0)).toBe(
            "Syncing…",
        );
        expect(syncLabel("dirty", { ...idle, phase: "retrying" }, 0)).toBe(
            "Sync failed — retrying",
        );
        expect(
            syncLabel("clean", { phase: "idle", autosavedAt: 1000 }, 31_000),
        ).toBe("Autosaved 30s ago");
    });

    it("formats ages", () => {
        expect(ago(-5)).toBe("0s ago");
        expect(ago(59_000)).toBe("59s ago");
        expect(ago(185_000)).toBe("3m ago");
    });
});
