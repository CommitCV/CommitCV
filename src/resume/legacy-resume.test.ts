import { describe, expect, it } from "vitest";
import { isLegacyResume, migrateLegacyResume } from "./legacy-resume";
import { ResumeParseError } from "./parse-resume";
import legacy from "./legacy-resume.fixture.json";

type Json = Record<string | number, unknown>;

function legacyObject(): Json {
    return structuredClone(legacy) as unknown as Json;
}

function at(obj: Json, path: (string | number)[]): Json {
    let node: unknown = obj;
    for (const key of path) {
        node = (node as Json)[key as string];
    }
    return node as Json;
}

function deleteAt(obj: Json, path: (string | number)[]): void {
    delete at(obj, path.slice(0, -1))[path[path.length - 1] as string];
}

function setAt(obj: Json, path: (string | number)[], value: unknown): void {
    at(obj, path.slice(0, -1))[path[path.length - 1] as string] = value;
}

function showPath(path: (string | number)[]): string {
    let out = "";
    for (const key of path) {
        out += typeof key === "number" ? `[${key}]` : out ? `.${key}` : key;
    }
    return out;
}

describe("isLegacyResume", () => {
    it("recognizes old CommitCV files", () => {
        expect(isLegacyResume(legacy)).toBe(true);
    });

    it.each([
        ["a schema version", { schema_version: 1 }],
        ["no header", { sections: [] }],
        ["no sections", { header: { name: "x" } }],
        ["not an object", "nope"],
    ])("rejects %s", (_name, input) => {
        expect(isLegacyResume(input)).toBe(false);
    });
});

describe("migrateLegacyResume", () => {
    it("migrates the fixture into the current schema", () => {
        const resume = migrateLegacyResume(legacy, {
            filename: "old-cv",
            date: "10-08-26",
        });

        expect(resume).toMatchObject({
            filename: "old-cv",
            date: "10-08-26",
            schema_version: 1,
        });
        expect(resume.sections).toHaveLength(8);

        const [header, education] = resume.sections;
        expect(header).toMatchObject({
            title: "Alex Reynolds",
            type: "header",
            toggled: true,
        });
        expect(header?.content[0]).toEqual({
            text: "alex.reynolds@example.com",
            flags: [],
            toggled: true,
        });
        expect(header?.content[2]).toEqual({
            text: "[github.com/alexreynoldsdev](https://github.com/alexreynoldsdev)",
            flags: ["link"],
            toggled: true,
        });

        expect(education).toMatchObject({
            title: "Education",
            type: "full-text",
        });
        const university = education?.subsections[0];
        expect(university?.type).toBe("sub-four-text-split");
        expect(university?.content.map((entry) => entry.text)).toEqual([
            "**University of Cascadia**",
            "Sep. 2022 -- Present",
            "*Bachelor of Science in Software Engineering, Minor in Cybersecurity*",
            "*Seattle, WA*",
        ]);
        expect(university?.subsections[0]).toMatchObject({
            type: "sub-full-text",
        });
        expect(university?.subsections[0]?.content[0]).toEqual({
            text: "**GPA:** 3.95 / 4.0, Member of the Dean's Honour List",
            flags: ["bullet"],
            toggled: true,
        });
    });

    it("turns every legacy section name into a titled section", () => {
        const resume = migrateLegacyResume(legacy, {
            filename: "x",
            date: "01-01-26",
        });
        const sections = legacy.sections as { name: string }[];
        sections.forEach((section, index) => {
            expect(resume.sections[index + 1]?.title).toBe(section.name);
        });
    });

    it("keeps section-level bullets and paragraphs apart", () => {
        const resume = migrateLegacyResume(legacy, {
            filename: "x",
            date: "01-01-26",
        });
        const awards = resume.sections.find(
            (section) => section.title === "Awards",
        );
        expect(awards?.content.map((entry) => entry.text)).toEqual([
            "**Hackathon Winner:** Best AI Project at CodeSprint 2024",
            "President’s Scholarship for Academic Excellence",
            "Google Cloud Developer Scholarship Recipient",
            "National Merit Scholar",
        ]);
        expect(
            awards?.content.every((entry) => entry.flags.includes("bullet")),
        ).toBe(true);

        const skills = resume.sections.find(
            (section) => section.title === "Technical Skills",
        );
        expect(skills?.content[0]?.text).toBe(
            "**Languages:** Python, JavaScript, C++, SQL, Rust, Java, Bash, HTML/CSS",
        );
        expect(skills?.content.map((entry) => entry.flags)).toEqual([[], []]);
    });

    it("uses a two-cell row when a subsection has no subtitle or location", () => {
        const resume = migrateLegacyResume(
            {
                header: { name: "A" },
                sections: [
                    {
                        name: "Experience",
                        subsections: [
                            {
                                title: "Cook",
                                date: "2024",
                                bulletCollection: [
                                    { bold: "Made", normal: "pancakes" },
                                ],
                            },
                        ],
                    },
                ],
            },
            { filename: "x", date: "01-01-26" },
        );
        const job = resume.sections[1]?.subsections[0];
        expect(job?.type).toBe("sub-two-split");
        expect(job?.content.map((entry) => entry.text)).toEqual([
            "**Cook**",
            "2024",
        ]);
        expect(job?.subsections[0]?.content).toEqual([
            { text: "**Made** pancakes", flags: ["bullet"], toggled: true },
        ]);
    });

    it("links a subsection title and fills missing cells", () => {
        const resume = migrateLegacyResume(
            {
                header: { name: "A" },
                sections: [
                    {
                        name: "Projects",
                        subsections: [
                            {
                                title: "Site",
                                link: "https://x.dev",
                                subtitle: "Web",
                            },
                        ],
                    },
                ],
            },
            { filename: "x", date: "01-01-26" },
        );
        const project = resume.sections[1]?.subsections[0];
        expect(project?.type).toBe("sub-four-text-split");
        expect(project?.content.map((entry) => entry.text)).toEqual([
            "[**Site**](https://x.dev)",
            "",
            "*Web*",
            "",
        ]);
        expect(project?.subsections).toEqual([]);
    });

    it("skips collection items with no text and keeps lone bold parts", () => {
        const resume = migrateLegacyResume(
            {
                header: { name: "A" },
                sections: [
                    {
                        name: "Misc",
                        bulletCollection: [
                            {},
                            { bold: "Label:" },
                            { normal: "plain" },
                        ],
                    },
                ],
            },
            { filename: "x", date: "01-01-26" },
        );
        expect(resume.sections[1]?.content).toEqual([
            { text: "**Label:**", flags: ["bullet"], toggled: true },
            { text: "plain", flags: ["bullet"], toggled: true },
        ]);
    });

    it.each([
        ["header name", ["header", "name"]],
        ["subheader text", ["header", "subheaders", 1, "text"]],
        ["section name", ["sections", 0, "name"]],
        ["subsection title", ["sections", 0, "subsections", 0, "title"]],
    ])("rejects a missing %s with its exact path", (_name, path) => {
        const bad = legacyObject();
        deleteAt(bad, path);
        try {
            migrateLegacyResume(bad, { filename: "x", date: "01-01-26" });
            expect.unreachable("should have thrown");
        } catch (err) {
            expect(err).toBeInstanceOf(ResumeParseError);
            expect((err as ResumeParseError).path).toBe(showPath(path));
        }
    });

    it.each([
        ["root", [], "x", /resume: expected an object/],
        ["header", ["header"], 42, /header: expected an object/],
        [
            "subheaders list",
            ["header", "subheaders"],
            42,
            /header\.subheaders: expected an array/,
        ],
        ["sections list", ["sections"], 42, /sections: expected an array/],
        [
            "subsections list",
            ["sections", 0, "subsections"],
            42,
            /sections\[0\]\.subsections: expected an array/,
        ],
        [
            "bulletCollection",
            ["sections", 0, "bulletCollection"],
            42,
            /sections\[0\]\.bulletCollection: expected an array/,
        ],
        [
            "section name",
            ["sections", 0, "name"],
            42,
            /sections\[0\]\.name: expected a string/,
        ],
        [
            "subsection location",
            ["sections", 0, "subsections", 0, "location"],
            42,
            /sections\[0\]\.subsections\[0\]\.location: expected a string/,
        ],
    ])(
        "rejects a malformed %s with its exact path",
        (_name, path, value, message) => {
            const bad = legacyObject();
            if (path.length === 0) {
                expect(() =>
                    migrateLegacyResume(value, {
                        filename: "x",
                        date: "01-01-26",
                    }),
                ).toThrow(message);
                return;
            }
            setAt(bad, path, value);
            expect(() =>
                migrateLegacyResume(bad, { filename: "x", date: "01-01-26" }),
            ).toThrow(message);
        },
    );
});
