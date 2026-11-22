import { describe, expect, it } from "vitest";
import type { IResume } from "@resume/resume";
import { entryMeta, restoreSummary } from "./history-entries";

const resume = (text: string): IResume => ({
    filename: "cv",
    date: "01-01-26",
    schema_version: 1,
    sections: [
        {
            title: "Experience",
            type: "full-text",
            toggled: true,
            content: [{ text, flags: [], toggled: true }],
            subsections: [],
        },
    ],
});

describe("entryMeta", () => {
    it("joins relative time and author", () => {
        const now = Date.UTC(2026, 0, 2);
        const entry = {
            sha: "a",
            message: "m",
            date: now - 5 * 60_000,
            author: "Ada",
        };
        expect(entryMeta(entry, now)).toBe("5 minutes ago by Ada");
    });
});

describe("restoreSummary", () => {
    it("lists changes without the bullet marker", () => {
        const lines = restoreSummary(resume("new"), resume("old"));
        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatch(/^experience: /);
    });

    it("is empty when nothing differs", () => {
        expect(restoreSummary(resume("same"), resume("same"))).toEqual([]);
    });
});
