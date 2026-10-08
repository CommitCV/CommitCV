import { describe, expect, it } from "vitest";
import { resolveDrop } from "./drag-drop";
import type { TDragItem, TDropTarget } from "./drag-drop";
import type { IResume, ISection } from "./resume";

function section(
    title: string,
    type: ISection["type"],
    subsections: ISection[] = [],
): ISection {
    return {
        title,
        type,
        toggled: true,
        content: [
            { text: `${title} a`, flags: [], toggled: true },
            { text: `${title} b`, flags: [], toggled: true },
        ],
        subsections,
    };
}

const resume: IResume = {
    filename: "test",
    date: "01-01-25",
    schema_version: 1,
    sections: [
        section("Name", "header"),
        section("Work", "full-text", [section("Job", "sub-full-text")]),
        section("Skills", "full-text"),
    ],
};

describe("resolveDrop", () => {
    it("places text before or after another text", () => {
        expect(
            resolveDrop(
                resume,
                { kind: "text", path: [1], index: 0 },
                { kind: "text", path: [2], index: 1, position: "after" },
            ),
        ).toEqual({
            kind: "text",
            fromPath: [1],
            fromIndex: 0,
            toPath: [2],
            toIndex: 2,
        });
    });

    it("appends text dropped onto a section", () => {
        expect(
            resolveDrop(
                resume,
                { kind: "text", path: [1], index: 0 },
                { kind: "section", path: [1, 0], position: "inside" },
            ),
        ).toMatchObject({ toPath: [1, 0], toIndex: 2 });
    });

    it("nests a section dropped inside another", () => {
        expect(
            resolveDrop(
                resume,
                { kind: "section", path: [2] },
                { kind: "section", path: [1], position: "inside" },
            ),
        ).toEqual({ kind: "section", from: [2], toParent: [1], toIndex: 1 });
    });

    it("places a section next to a nested one", () => {
        expect(
            resolveDrop(
                resume,
                { kind: "section", path: [2] },
                { kind: "section", path: [1, 0], position: "before" },
            ),
        ).toEqual({ kind: "section", from: [2], toParent: [1], toIndex: 0 });
    });

    it.each([
        [
            "into its own subtree",
            { kind: "section", path: [1] },
            { kind: "section", path: [1, 0], position: "inside" },
        ],
        [
            "before the header",
            { kind: "section", path: [2] },
            { kind: "section", path: [0], position: "before" },
        ],
        [
            "inside the header",
            { kind: "section", path: [2] },
            { kind: "section", path: [0], position: "inside" },
        ],
        [
            "a section onto text",
            { kind: "section", path: [2] },
            { kind: "text", path: [1], index: 0, position: "before" },
        ],
        [
            "the header itself",
            { kind: "section", path: [0] },
            { kind: "section", path: [2], position: "after" },
        ],
    ] as [string, TDragItem, TDropTarget][])(
        "rejects dropping %s",
        (_, item, target) => {
            expect(resolveDrop(resume, item, target)).toBeNull();
        },
    );
});
