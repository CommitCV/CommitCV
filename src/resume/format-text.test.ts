import { describe, expect, it } from "vitest";
import {
    inlineStylesAt,
    toggleInlineStyle,
    toggleLineFlag,
    wrapSelection,
} from "./format-text";
import type { TFlag } from "./resume";

describe("toggleLineFlag", () => {
    it("adds a missing flag without touching the text", () => {
        expect(toggleLineFlag({ text: "a", flags: [] }, "bold")).toEqual({
            text: "a",
            flags: ["bold"],
        });
    });

    it("removes the flag and markers wrapping the whole line", () => {
        expect(
            toggleLineFlag({ text: "**a**", flags: ["bold"] }, "bold"),
        ).toEqual({ text: "a", flags: [] });
    });

    it("keeps partial styling when removing the flag", () => {
        expect(
            toggleLineFlag({ text: "**a** b **c**", flags: ["bold"] }, "bold"),
        ).toEqual({ text: "**a** b **c**", flags: [] });
    });
});

describe("wrapSelection", () => {
    it("wraps the selected range and keeps it selected", () => {
        expect(wrapSelection("say hi now", 4, 6, "**", "**")).toEqual({
            text: "say **hi** now",
            start: 6,
            end: 8,
        });
    });

    it("wraps a link around the selection", () => {
        expect(wrapSelection("site", 0, 4, "[", "](https://a.com)")).toEqual({
            text: "[site](https://a.com)",
            start: 1,
            end: 5,
        });
    });
});

/** Applies `fn` to the `‹…›`-marked part of `marked`, returning it re-marked. */
function onMarked(
    marked: string,
    fn: (
        text: string,
        start: number,
        end: number,
    ) => { text: string; start: number; end: number },
): string {
    const start = marked.indexOf("‹");
    const end = marked.indexOf("›") - 1;
    const next = fn(marked.replace("‹", "").replace("›", ""), start, end);
    return (
        next.text.slice(0, next.start) +
        "‹" +
        next.text.slice(next.start, next.end) +
        "›" +
        next.text.slice(next.end)
    );
}

describe("toggleInlineStyle", () => {
    it.each<[string, string, TFlag, string]>([
        ["wraps plain text", "say ‹hi› now", "bold", "say **‹hi›** now"],
        ["unwraps markers around", "say **‹hi›** now", "bold", "say ‹hi› now"],
        ["unwraps markers inside", "say ‹**hi**› now", "bold", "say ‹hi› now"],
        ["toggles italics off", "say *‹hi›* now", "italics", "say ‹hi› now"],
        ["adds italics inside bold", "**‹hi›**", "italics", "***‹hi›***"],
        ["removes italics from bold", "***‹hi›***", "italics", "**‹hi›**"],
        ["removes bold from both", "***‹hi›***", "bold", "*‹hi›*"],
        ["toggles underline off", "__‹hi›__", "underline", "‹hi›"],
        [
            "merges a selection overlapping a styled word",
            "‹say **hi**› now",
            "bold",
            "**‹say hi›** now",
        ],
        [
            "merges a selection covering a styled word",
            "‹say **hi** now›",
            "bold",
            "**‹say hi now›**",
        ],
        [
            "extends a style that starts inside the selection",
            "say **hi ‹now** then›",
            "bold",
            "say **hi ‹now then›**",
        ],
        [
            "removes a style from part of a styled word",
            "**say ‹hi› now**",
            "bold",
            "**say** ‹hi› **now**",
        ],
        [
            "keeps links while styling across them",
            "‹see [site](https://a.com) now›",
            "italics",
            "*‹see* [*site*](https://a.com) *now›*",
        ],
    ])("%s", (_, marked, flag, expected) => {
        expect(
            onMarked(marked, (text, start, end) =>
                toggleInlineStyle(text, start, end, flag),
            ),
        ).toBe(expected);
    });

    it("round-trips on then off", () => {
        const on = toggleInlineStyle("say hi now", 4, 6, "underline");
        const off = toggleInlineStyle(on.text, on.start, on.end, "underline");
        expect(off).toEqual({ text: "say hi now", start: 4, end: 6 });
    });
});

describe("inlineStylesAt", () => {
    it.each<[string, number, TFlag[]]>([
        ["say **hi** now", 7, ["bold"]],
        ["say **hi** now", 2, []],
        ["say **hi** now", 10, []],
        ["***both***", 5, ["bold", "italics"]],
        ["[**x**](https://a.com)", 4, ["bold"]],
        // A caret between a marker's characters counts as touching the styled text.
        ["say **hi** now", 5, ["bold"]],
        ["say **hi** now", 9, ["bold"]],
        ["say __hi__ now", 5, ["underline"]],
        ["***both***", 1, ["bold", "italics"]],
        ["***both***", 9, ["bold", "italics"]],
    ])("%s at %i", (text, caret, expected) => {
        expect(inlineStylesAt(text, caret, caret).sort()).toEqual(
            [...expected].sort(),
        );
    });

    it("reports only styles the whole selection shares", () => {
        expect(inlineStylesAt("**a** b", 0, 7)).toEqual([]);
        expect(inlineStylesAt("**a *b***", 0, 9)).toEqual(["bold"]);
    });

    it("widens a selection that starts or ends inside a marker", () => {
        expect(inlineStylesAt("say **hi** now", 5, 9)).toEqual(["bold"]);
    });
});

describe("toggleInlineStyle at a caret", () => {
    it("removes the style from the styled text around the caret", () => {
        expect(toggleInlineStyle("a **text** b", 5, 5, "bold").text).toBe(
            "a text b",
        );
    });
});
