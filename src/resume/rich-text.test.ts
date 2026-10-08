import { describe, expect, it } from "vitest";
import { parseInline } from "./inline-markup";
import { markupToHtml, runsToMarkup } from "./rich-text";

/** Parses with flags sorted: `**[x](u)**` and `[**x**](u)` mean the same. */
function normalized(markup: string) {
    return parseInline(markup).map((run) =>
        run.type === "text" ? { ...run, flags: [...run.flags].sort() } : run,
    );
}

describe("markupToHtml", () => {
    it("renders styles, links and icons", () => {
        expect(markupToHtml("**a** *b* __c__ ~~d~~")).toBe(
            "<b>a</b> <i>b</i> <u>c</u> <s>d</s>",
        );
        expect(markupToHtml("[site](https://a.com)")).toBe(
            '<a href="https://a.com">site</a>',
        );
        expect(markupToHtml("$fa-github$")).toBe(
            '<span contenteditable="false" data-icon="fa-github">$fa-github$</span>',
        );
    });

    it("escapes html in text and urls", () => {
        expect(markupToHtml('<b>"x"</b> & y')).toBe(
            "&lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y",
        );
    });
});

describe("runsToMarkup", () => {
    it.each([
        "plain text",
        "**bold** and *italic*",
        "__under__ ~~gone~~",
        "***both***",
        "**__~~*all*~~__**",
        "say **[hi](https://a.com)** now",
        "[**bold** link](https://a.com)",
        "[alex@example.com](mailto:alex@example.com)",
        "icon $fa-github$ here",
    ])("round-trips %s", (markup) => {
        expect(normalized(runsToMarkup(parseInline(markup)))).toEqual(
            normalized(markup),
        );
    });

    it("merges neighbouring runs with the same style", () => {
        expect(
            runsToMarkup([
                { type: "text", text: "a", flags: ["bold"] },
                { type: "text", text: "b", flags: ["bold"] },
            ]),
        ).toBe("**ab**");
    });

    it("keeps edge spaces outside markers", () => {
        expect(
            runsToMarkup([
                { type: "text", text: "say", flags: [] },
                { type: "text", text: " hi ", flags: ["bold"] },
                { type: "text", text: "now", flags: [] },
            ]),
        ).toBe("say **hi** now");
    });
});
