import { describe, expect, it } from "vitest";
import {
    addSection,
    addText,
    moveSection,
    removeSection,
    removeText,
    sectionAt,
    updateSection,
    updateText,
} from "./edit-resume";
import type { IResume, ISection } from "./resume";

function makeResume(): IResume {
    return {
        filename: "test",
        date: "01-01-25",
        schema_version: 1,
        sections: [
            {
                title: "Travis Friesen",
                type: "header",
                toggled: true,
                content: [{ text: "a@b.c", flags: [], toggled: true }],
                subsections: [],
            },
            {
                title: "Experience",
                type: "full-text",
                toggled: true,
                content: [],
                subsections: [
                    {
                        title: "",
                        type: "sub-four-text-split",
                        toggled: true,
                        content: [
                            {
                                text: "**Intern**",
                                flags: ["bold"],
                                toggled: true,
                            },
                            { text: "2025", flags: [], toggled: true },
                        ],
                        subsections: [
                            {
                                title: "",
                                type: "sub-full-text",
                                toggled: true,
                                content: [
                                    {
                                        text: "Did things",
                                        flags: ["bullet"],
                                        toggled: true,
                                    },
                                ],
                                subsections: [],
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

const added: ISection = {
    title: "Skills",
    type: "full-text",
    toggled: true,
    content: [],
    subsections: [],
};

describe("edit-resume", () => {
    it("sectionAt walks nested paths", () => {
        const resume = makeResume();
        expect(sectionAt(resume, [1, 0, 0])?.type).toBe("sub-full-text");
        expect(sectionAt(resume, [1, 0, 9])).toBeNull();
    });

    it("updateText edits the addressed text and never mutates the input", () => {
        const original = makeResume();
        const next = updateText(original, [1, 0, 0], 0, {
            text: "Fixed things",
        });
        expect(sectionAt(next, [1, 0, 0])?.content[0].text).toBe(
            "Fixed things",
        );
        expect(sectionAt(original, [1, 0, 0])?.content[0].text).toBe(
            "Did things",
        );
    });

    it("updateSection patches fields and keeps the rest", () => {
        const next = updateSection(makeResume(), [1], { title: "Work" });
        expect(next.sections[1].title).toBe("Work");
        expect(next.sections[1].subsections).toHaveLength(1);
    });

    it("addSection appends at the top level and nested", () => {
        const next = addSection(makeResume(), [], added);
        expect(next.sections).toHaveLength(3);
        const nested = addSection(next, [1, 0], added);
        expect(nested.sections[1].subsections[0].subsections).toHaveLength(2);
    });

    it("removeSection leaves an empty list behind", () => {
        const next = removeSection(makeResume(), [1, 0]);
        expect(next.sections[1].subsections).toEqual([]);
    });

    it("moveSection swaps and ignores out-of-range moves", () => {
        const resume = makeResume();
        const up = moveSection(resume, [0], -1);
        expect(up.sections[0].title).toBe("Travis Friesen");
        const down = moveSection(resume, [1], 1);
        expect(down.sections[1].title).toBe("Experience");
        const swapped = moveSection(resume, [1], -1);
        expect(swapped.sections[0].title).toBe("Experience");
    });

    it("addText appends and removeText deletes by index", () => {
        const resume = makeResume();
        const next = addText(resume, [0], {
            text: "204-555-0101",
            flags: [],
            toggled: true,
        });
        expect(next.sections[0].content).toHaveLength(2);
        const removed = removeText(next, [0], 0);
        expect(removed.sections[0].content[0].text).toBe("204-555-0101");
    });

    it("throws on invalid paths", () => {
        expect(() =>
            updateText(makeResume(), [1, 0, 0], 5, { text: "x" }),
        ).toThrow();
        expect(() =>
            updateSection(makeResume(), [9], { title: "x" }),
        ).toThrow();
    });
});
