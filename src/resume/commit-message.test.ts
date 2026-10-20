import { describe, expect, it } from "vitest";
import {
    generateCommitBody,
    generateCommitMessage,
    matchSections,
} from "./commit-message";
import type { IResume, ISection, TSectionType } from "./resume";

const text = (t: string, toggled = true) => ({ text: t, flags: [], toggled });
const sec = (
    title: string,
    lines: string[] = [],
    over: Partial<ISection> = {},
): ISection => ({
    title,
    type: "full-text",
    toggled: true,
    content: lines.map((l) => text(l)),
    subsections: [],
    ...over,
});
const resume = (
    sections: ISection[],
    over: Partial<IResume> = {},
): IResume => ({
    filename: "cv",
    date: "01-01-26",
    schema_version: 1,
    sections,
    ...over,
});
const sub = (
    title: string,
    lines: string[] = [],
    type: TSectionType = "sub-full-text",
) => sec(title, lines, { type });

const base = resume([
    sec("Header", ["a@b.c"], { type: "header" }),
    sec("Experience", ["one", "two", "three"]),
    sec("Education", ["BSc"]),
    sec("Skills", ["TS"]),
]);
const withSection = (title: string, s: ISection) =>
    resume(base.sections.map((x) => (x.title === title ? s : x)));

describe("generateCommitMessage", () => {
    it.each([
        ["create when prev is null", null, base, "create cv"],
        ["no change", base, structuredClone(base), "update cv"],
        [
            "metadata only",
            base,
            { ...base, date: "02-02-26", filename: "cv" },
            "update cv",
        ],
        ["empty to empty", resume([]), resume([]), "update cv"],
        [
            "add section",
            base,
            resume([...base.sections, sec("Projects", ["x"])]),
            "add section: Projects",
        ],
        [
            "remove section",
            base,
            resume(base.sections.slice(0, 3)),
            "remove section: Skills",
        ],
        [
            "from empty resume",
            resume([]),
            resume([sec("Projects")]),
            "add section: Projects",
        ],
        [
            "reorder",
            base,
            resume([
                ...base.sections.slice(0, 1),
                ...base.sections.slice(1).reverse(),
            ]),
            "reorder sections",
        ],
        [
            "rename",
            base,
            withSection("Experience", sec("Work", ["one", "two", "three"])),
            "rename section: Experience -> Work",
        ],
        [
            "toggle off",
            base,
            withSection("Skills", sec("Skills", ["TS"], { toggled: false })),
            "toggle off section: Skills",
        ],
        [
            "toggle on",
            withSection("Skills", sec("Skills", ["TS"], { toggled: false })),
            base,
            "toggle on section: Skills",
        ],
        [
            "header",
            base,
            withSection(
                "Header",
                sec("Header", ["new@b.c"], { type: "header" }),
            ),
            "update header",
        ],
        [
            "edit one entry",
            base,
            withSection(
                "Experience",
                sec("Experience", ["one", "TWO", "three"]),
            ),
            "update experience: edit 1 entry",
        ],
        [
            "edits plus an add",
            base,
            withSection(
                "Experience",
                sec("Experience", ["ONE", "TWO", "three", "Acme"]),
            ),
            'update experience: edit 2 entries, add "Acme"',
        ],
        [
            "entry removed",
            base,
            withSection("Experience", sec("Experience", ["one", "two"])),
            'update experience: remove "three"',
        ],
        [
            "flag change counts as edit",
            base,
            withSection(
                "Skills",
                sec("Skills", [], {
                    content: [{ text: "TS", flags: ["bold"], toggled: true }],
                }),
            ),
            "update skills: edit 1 entry",
        ],
        [
            "entry toggled counts as edit",
            base,
            withSection(
                "Skills",
                sec("Skills", [], { content: [text("TS", false)] }),
            ),
            "update skills: edit 1 entry",
        ],
        [
            "many sections summarised",
            base,
            resume([
                sec("Header", ["x"], { type: "header" }),
                sec("Experience", ["x"]),
                sec("Education", ["x"]),
                sec("Skills", ["x"]),
            ]),
            "update header, experience, +2 more",
        ],
        [
            "three touched sections listed in full",
            base,
            resume([
                base.sections[0],
                sec("Experience", ["x"]),
                sec("Education", ["x"]),
                sec("Skills", ["x"]),
            ]),
            "update experience, education, skills",
        ],
        [
            "add and remove",
            base,
            resume([
                ...base.sections.slice(0, 3),
                sec("Projects", ["p"], { type: "two-split" }),
            ]),
            "update projects, skills",
        ],
    ] as [string, IResume | null, IResume, string][])(
        "%s",
        (_n, prev, next, want) => {
            expect(generateCommitMessage(prev, next)).toBe(want);
        },
    );

    it("rolls subsection changes up into the top-level section", () => {
        const prev = resume([
            sec("Experience", [], {
                subsections: [sub("Acme", ["a", "b"]), sub("Beta", ["c"])],
            }),
        ]);
        const next = resume([
            sec("Experience", [], {
                subsections: [
                    sub("Acme", ["a", "B"]),
                    sub("Beta", ["c"]),
                    sub("Gamma", ["g"]),
                ],
            }),
        ]);
        expect(generateCommitMessage(prev, next)).toBe(
            'update experience: edit 1 entry, add "Gamma"',
        );
        expect(generateCommitMessage(next, prev)).toBe(
            'update experience: edit 1 entry, remove "Gamma"',
        );
    });

    it("renames plus reorders still reads as a rename", () => {
        const next = resume([
            base.sections[0],
            base.sections[2],
            sec("Work", ["one", "two", "three"]),
            base.sections[3],
        ]);
        expect(generateCommitMessage(base, next)).toBe(
            "rename section: Experience -> Work",
        );
    });

    it("pairs duplicate titles in order", () => {
        const dup = resume([sec("Notes", ["1"]), sec("Notes", ["2"])]);
        const edited = resume([sec("Notes", ["1"]), sec("Notes", ["2!"])]);
        expect(generateCommitMessage(dup, edited)).toBe(
            "update notes: edit 1 entry",
        );
        expect(
            generateCommitMessage(
                dup,
                resume([dup.sections[1], dup.sections[0]]),
            ),
        ).toBe("update notes");
    });

    it("is deterministic", () => {
        const next = withSection("Skills", sec("Skills", ["JS"]));
        expect(generateCommitMessage(base, next)).toBe(
            generateCommitMessage(base, next),
        );
    });

    it("truncates to 72 chars with an ellipsis", () => {
        const title = "x".repeat(80);
        const msg = generateCommitMessage(
            base,
            resume([...base.sections, sec(title)]),
        );
        expect(msg).toHaveLength(72);
        expect(msg.endsWith("…")).toBe(true);
        expect(msg.startsWith("add section: xxx")).toBe(true);
    });
});

describe("matchSections", () => {
    it("matches by type+title before position", () => {
        const prev = [sec("A"), sec("B")];
        expect(matchSections(prev, [sec("B"), sec("A")])).toEqual([1, 0]);
    });

    it("pairs leftovers of the same type by position, never across types", () => {
        const prev = [sec("A"), sec("B", [], { type: "two-split" })];
        const next = [sec("C", [], { type: "two-split" }), sec("D")];
        expect(matchSections(prev, next)).toEqual([1, 0]);
        expect(
            matchSections([sec("A")], [sec("A", [], { type: "two-split" })]),
        ).toEqual([-1]);
    });
});

describe("generateCommitBody", () => {
    it("is empty on create and when nothing changed", () => {
        expect(generateCommitBody(null, base)).toBe("");
        expect(generateCommitBody(base, base)).toBe("");
    });

    it("lists each change with its line", () => {
        const next = withSection(
            "Experience",
            sec("Work", ["one", "Led team of 5", "three", "new"], {
                toggled: false,
            }),
        );
        expect(generateCommitBody(base, next)).toBe(
            [
                '- work: renamed from "Experience"',
                "- work: toggled off",
                '- work: edited "Led team of 5" (line 2)',
                '- work: added "new" (line 4)',
            ].join("\n"),
        );
    });

    it("lists section adds, removes and reorders", () => {
        const next = resume([
            base.sections[1],
            base.sections[0],
            sec("Projects", [], { type: "two-split" }),
        ]);
        expect(generateCommitBody(base, next).split("\n")).toEqual([
            '- added section "Projects"',
            '- removed section "Education"',
            '- removed section "Skills"',
            "- reordered sections",
        ]);
    });

    it("caps at 20 lines", () => {
        const many = (n: number) =>
            resume([
                sec(
                    "Big",
                    Array.from({ length: n }, (_, i) => `l${i}`),
                ),
            ]);
        const lines = generateCommitBody(resume([sec("Big")]), many(30)).split(
            "\n",
        );
        expect(lines).toHaveLength(20);
        expect(lines[19]).toBe("- ...and 11 more");
    });
});
