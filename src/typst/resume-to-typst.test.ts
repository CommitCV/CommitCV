import { describe, expect, it } from "vitest";
import { escapeMarkup, escapeUrl, resumeToTypst } from "./resume-to-typst";
import type { IResume, IResumeText, ISection } from "@resume/resume";
import { parseResume } from "@resume/parse-resume";
import sample from "@resume/sample-resume.json";

function text(t: string, flags: string[] = []): IResumeText {
    return { text: t, flags: flags as IResumeText["flags"], toggled: true };
}

function section(
    title: string,
    type: ISection["type"],
    content: IResumeText[] = [],
    subsections: ISection[] = [],
): ISection {
    return { title, type, toggled: true, content, subsections };
}

function resume(sections: ISection[]): IResume {
    return { filename: "x", date: "01-01-25", schema_version: 1, sections };
}

const sampleResume = parseResume(sample);

describe("escaping", () => {
    it.each(["#", "$", "*", "_", "@", "<", ">", "[", "]", "\\", "`", "~"])(
        "escapes %#",
        (c) => {
            expect(escapeMarkup(`a${c}b`)).toBe(`a\\${c}b`);
        },
    );

    it("escapes line comments", () => {
        expect(escapeMarkup("see https://x.com")).toBe("see https:\\//x.com");
    });

    it("leaves ordinary text alone", () => {
        expect(escapeMarkup("May 2025 - Aug. 2025 (RBC)")).toBe(
            "May 2025 - Aug. 2025 (RBC)",
        );
    });

    it("keeps typst code as literal text", () => {
        expect(escapeMarkup('#read("/x")')).toBe('\\#read("/x")');
    });

    it("keeps a url with quotes and backslashes a valid literal", () => {
        expect(escapeUrl('a"b\\c')).toBe('a\\"b\\\\c');
    });
});

describe("resumeToTypst", () => {
    it("emits the template imports and show rule", () => {
        const source = resumeToTypst(
            resume([section("Skills", "full-text", [text("Java")])]),
        );
        expect(source).toContain('#import "jake.typ": *');
        expect(source).toContain(
            '#import "fontawesome/lib.typ": fa-icon, fa-version',
        );
        expect(source).toContain("#show: resume.with(");
        expect(source).toContain('#fa-version("6")');
    });

    it("renders the real sample end to end", () => {
        const source = resumeToTypst(sampleResume);
        expect(source).toContain('author-name: "Travis Friesen"');
        expect(source).toContain('#custom-title("Education")[');
        expect(source).toContain("#work-entry(");
        expect(source).toContain("*B.Sc. in Computer Science");
        expect(source).toContain("_Royal Bank of Canada - Toronto, ON_");
        expect(source).toContain("- Migrated over 30+ APIs");
    });

    it("leaves the sample's malformed mailto as literal text, unlinked", () => {
        const source = resumeToTypst(sampleResume);
        expect(source).toContain("contact-items: (");
        expect(source).not.toContain('#link("mailto:travis@travisfriesen.ca]');
    });

    it("skips anything toggled off at every level", () => {
        const r = resume([
            section("Hidden", "full-text", [text("x")]),
            section("Visible", "full-text", [text("y")]),
        ]);
        r.sections[0].toggled = false;
        const source = resumeToTypst(r);
        expect(source).not.toContain("Hidden");
        expect(source).toContain("Visible");
    });

    it("renders sub sections without a heading", () => {
        const r = resume([
            section(
                "Experience",
                "full-text",
                [],
                [
                    section("", "sub-four-text-split", [
                        text("**Intern**", ["bold"]),
                    ]),
                ],
            ),
        ]);
        const source = resumeToTypst(r);
        expect(source).toContain('#custom-title("Experience")[');
        expect(source).toContain("#work-entry(");
        expect(source).not.toContain('#custom-title("")');
    });

    it("leaves the fourth split slot empty for a 3-item row", () => {
        const r = resume([
            section("Education", "four-text-split", [
                text("**Degree**", ["bold"]),
                text("Sept. 2023 - Present"),
                text("*School*", ["italics"]),
            ]),
        ]);
        const call = resumeToTypst(r).split("#work-entry(")[1];
        expect(call).toMatch(/\[\],\s*\n\s*\)\[\]/);
        expect(call).toContain("*Degree*");
    });

    it("renders icons as fa-icon calls with the fa- prefix stripped", () => {
        const r = resume([
            section("Header", "header", [
                text("$fa-square-github$[/x](https://x)", ["link", "icon"]),
            ]),
        ]);
        const source = resumeToTypst(r);
        expect(source).toContain('#fa-icon("square-github")');
        expect(source).toContain('#link("https://x")[/x]');
    });

    it("applies editor flags even when text has no inline markers", () => {
        const source = resumeToTypst(
            resume([
                section("Skills", "full-text", [
                    text("Plain text", ["bold", "italics"]),
                ]),
            ]),
        );
        expect(source).toContain("*_Plain text_*");
    });

    it("escapes line-leading markers in full text", () => {
        const r = resume([
            section("Skills", "full-text", [text("= not a heading")]),
        ]);
        expect(resumeToTypst(r)).toContain("\\= not a heading");
    });

    it.each([
        [
            "a split cell",
            () => section("Edu", "four-text-split", [text("= x")]),
        ],
        ["a header item", () => section("Me", "header", [text("= x")])],
    ])("escapes line-leading markers in %s", (_label, build) => {
        expect(resumeToTypst(resume([build()]))).toContain("[\\= x]");
    });

    it("escapes a leading number so it is not an enum item", () => {
        const r = resume([
            section("Log", "full-text", [text("2024. Started", ["bullet"])]),
        ]);
        expect(resumeToTypst(r)).toContain("- 2024\\. Started");
    });

    it("escapes markers that follow a newline", () => {
        const r = resume([section("Log", "full-text", [text("a\n= b")])]);
        expect(resumeToTypst(r)).toMatch(/a\n\s*\\= b/);
    });

    it("keeps the bigger flag when the text has inline styling", () => {
        const r = resume([
            section("Me", "header", [text("**Big** name", ["bold", "bigger"])]),
        ]);
        expect(resumeToTypst(r)).toContain("#text(size: 13pt)[");
    });

    it("never emits a link for an unsafe url scheme", () => {
        const r = resume([
            section("Me", "header", [text("[x](javascript:alert)", ["link"])]),
        ]);
        expect(resumeToTypst(r)).not.toContain("#link(");
    });

    it("groups plain lines into skills and bullet lines into bullets", () => {
        const r = resume([
            section("Skills", "full-text", [
                text("**A:** 1", ["bold"]),
                text("item", ["bullet"]),
                text("item 2", ["bullet"]),
                text("**B:** 2", ["bold"]),
            ]),
        ]);
        const body = resumeToTypst(r).split('#custom-title("Skills")[\n')[1];
        expect(body).toMatch(
            /#skills\(\)\[\n\s*- \*A:\* 1\n\s*\]\n\s*#bullets\(\)\[\n\s*- item\n\s*- item 2\n\s*\]\n\s*#skills\(\)\[\n\s*- \*B:\* 2/,
        );
    });

    it("nests a split row's subsections as its entry body", () => {
        const r = resume([
            section(
                "Projects",
                "full-text",
                [],
                [
                    section(
                        "",
                        "sub-two-split",
                        [text("**App**", ["bold"]), text("2024")],
                        [
                            section("", "sub-full-text", [
                                text("Built", ["bullet"]),
                            ]),
                        ],
                    ),
                ],
            ),
        ]);
        expect(resumeToTypst(r)).toMatch(
            /#split-entry\(\n\s*\[\*App\*\],\n\s*\[2024\],\n\s*\)\[\n\s*#bullets\(\)\[\n\s*- Built/,
        );
    });

    it("quotes header and title strings safely", () => {
        const r = resume([
            section('A "B" \\', "header"),
            section('X "Y"', "full-text", [text("z")]),
        ]);
        const source = resumeToTypst(r);
        expect(source).toContain('author-name: "A \\"B\\" \\\\"');
        expect(source).toContain('#custom-title("X \\"Y\\"")[');
    });

    it("omits imports in standalone mode", () => {
        const source = resumeToTypst(sampleResume, { standalone: true });
        expect(source).not.toContain("#import");
        expect(source.startsWith('#fa-version("6")')).toBe(true);
    });
});
