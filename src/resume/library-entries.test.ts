import { describe, expect, it } from "vitest";
import {
    formatBytes,
    formatRelativeTime,
    lastEdited,
    sortEntries,
} from "./library-entries";

const NOW = Date.UTC(2026, 0, 15, 12);
const entry = (id: string, updatedAt?: number) => ({
    id,
    filename: id,
    date: "01-01-26",
    updatedAt,
});

describe("sortEntries", () => {
    it("orders newest first with unknown times last, without mutating", () => {
        const input = [entry("old", 1), entry("none"), entry("new", 5)];
        expect(sortEntries(input).map((e) => e.id)).toEqual([
            "new",
            "old",
            "none",
        ]);
        expect(input[0].id).toBe("old");
    });
});

describe("formatRelativeTime", () => {
    it.each([
        [30_000, "just now"],
        [5 * 60_000, "5 minutes ago"],
        [3 * 3_600_000, "3 hours ago"],
        [86_400_000, "yesterday"],
        [3 * 86_400_000, "3 days ago"],
        [60 * 86_400_000, "2 months ago"],
        [400 * 86_400_000, "last year"],
    ])("%i ms ago", (ago, text) => {
        expect(formatRelativeTime(NOW - ago, NOW)).toBe(text);
    });

    it("treats a future time as just now", () => {
        expect(formatRelativeTime(NOW + 10_000, NOW)).toBe("just now");
    });
});

describe("lastEdited", () => {
    it("uses the save time", () => {
        expect(lastEdited(entry("a", NOW - 120_000), NOW)).toBe(
            "Last edited 2 minutes ago",
        );
    });
    it("falls back to the resume date", () => {
        expect(lastEdited(entry("a"), NOW)).toBe("Last edited 01-01-26");
    });
});

describe("formatBytes", () => {
    it("scales units", () => {
        expect(formatBytes(512)).toBe("512 B");
        expect(formatBytes(1536)).toBe("1.5 KB");
        expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    });
});
