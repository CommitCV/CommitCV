import { describe, expect, it } from "vitest";
import { parseInline } from "./inline-markup";

const MAILTO = "[travis@travisfriesen.ca](mailto:travis@travisfriesen.ca]";

describe("parseInline", () => {
    it.each([
        ["**bold**", "bold", "bold"],
        ["*italic*", "italic", "italics"],
        ["__under__", "under", "underline"],
        ["~~gone~~", "gone", "strikethrough"],
    ])("parses %# %s", (markup, inner, flag) => {
        expect(parseInline(markup)).toEqual([
            { type: "text", text: inner, flags: [flag] },
        ]);
    });

    it("leaves plain text and lone underscores alone", () => {
        expect(parseInline("plain text")).toEqual([
            { type: "text", text: "plain text", flags: [] },
        ]);
        expect(parseInline("file_name")).toEqual([
            { type: "text", text: "file_name", flags: [] },
        ]);
    });

    it("parses adjacent runs", () => {
        expect(parseInline("**a** *b*")).toEqual([
            { type: "text", text: "a", flags: ["bold"] },
            { type: "text", text: " ", flags: [] },
            { type: "text", text: "b", flags: ["italics"] },
        ]);
    });

    it("nests a link inside bold", () => {
        expect(parseInline("**[a](b)**")).toEqual([
            { type: "text", text: "a", flags: ["bold", "link"], href: "b" },
        ]);
    });

    it("parses an icon directly followed by a link", () => {
        expect(parseInline("$fa-linkedin$[/x](u)")).toEqual([
            { type: "icon", name: "fa-linkedin" },
            { type: "text", text: "/x", flags: ["link"], href: "u" },
        ]);
    });

    it("keeps an unclosed marker literal", () => {
        expect(parseInline("a **b")).toEqual([
            { type: "text", text: "a **b", flags: [] },
        ]);
    });

    it("keeps a malformed link literal (the real sample's mailto)", () => {
        expect(parseInline(MAILTO)).toEqual([
            { type: "text", text: MAILTO, flags: [] },
        ]);
    });

    it("keeps a malformed icon literal", () => {
        expect(parseInline("$fa- link$")).toEqual([
            { type: "text", text: "$fa- link$", flags: [] },
        ]);
    });

    it.each([
        "https://x.com",
        "http://x.com",
        "mailto:a@b.com",
        "tel:+15551234",
        "/relative",
        "x.com/path",
    ])("keeps a link to %s", (url) => {
        expect(parseInline(`[a](${url})`)).toEqual([
            { type: "text", text: "a", flags: ["link"], href: url },
        ]);
    });

    it.each([
        "javascript:alert",
        "JaVaScRiPt:alert",
        "java\tscript:alert",
        " javascript:alert",
        "data:text/html,x",
        "vbscript:x",
    ])("keeps a link to %j literal", (url) => {
        const markup = `[a](${url})`;
        expect(parseInline(markup)).toEqual([
            { type: "text", text: markup, flags: [] },
        ]);
    });
});
