import { parseInline, type TInlineRun } from "./inline-markup";
import type { IResumeText, TFlag } from "./resume";
import { INLINE_STYLES, runsToMarkup } from "./rich-text";

export const INLINE_MARKERS: Partial<Record<TFlag, string>> = {
    bold: "**",
    italics: "*",
    underline: "__",
};

/**
 * Toggles a whole-line flag. Turning a style off also drops markers that
 * wrap the whole line, unless the line has other markup of that kind
 * inside (partial styling stays).
 */
export function toggleLineFlag(
    { text, flags }: Pick<IResumeText, "text" | "flags">,
    flag: TFlag,
): Pick<IResumeText, "text" | "flags"> {
    if (!flags.includes(flag)) return { text, flags: [...flags, flag] };
    return {
        text: unwrapLineStyle(text, flag),
        flags: flags.filter((value) => value !== flag),
    };
}

function unwrapLineStyle(value: string, flag: TFlag): string {
    const marker = INLINE_MARKERS[flag];
    if (!marker || value.length <= marker.length * 2) return value;
    const inner = value.slice(marker.length, -marker.length);
    return value.startsWith(marker) &&
        value.endsWith(marker) &&
        !inner.includes(marker)
        ? inner
        : value;
}

/** Wraps `text[start, end)` in `before`/`after`; returns the new text and inner selection. */
export function wrapSelection(
    text: string,
    start: number,
    end: number,
    before: string,
    after: string,
): { text: string; start: number; end: number } {
    return {
        text:
            text.slice(0, start) +
            before +
            text.slice(start, end) +
            after +
            text.slice(end),
        start: start + before.length,
        end: end + before.length,
    };
}

// Private-use characters that mark the selection while it's parsed.
const SEL_START = "\uE000";
const SEL_END = "\uE001";

interface IPiece {
    run: TInlineRun;
    selected: boolean;
}

/**
 * Parses `text` with the selection marked, splitting runs at its edges.
 * Returns `null` when an edge falls somewhere that doesn't parse as text,
 * such as inside a link's URL.
 */
function splitAtSelection(
    text: string,
    start: number,
    end: number,
): { pieces: IPiece[]; caretFlags: TFlag[]; caretIndex: number } | null {
    // Widen a selection whose ends fall inside a marker to take it whole.
    if (start !== end) {
        start = markerAround(text, start)?.from ?? start;
        end = markerAround(text, end)?.to ?? end;
    }
    const marked =
        text.slice(0, start) +
        SEL_START +
        text.slice(start, end) +
        SEL_END +
        text.slice(end);
    const pieces: IPiece[] = [];
    let selected = false;
    let caretFlags: TFlag[] | null = null;
    let sawEnd = false;
    let caretIndex = 0;
    for (const run of parseInline(marked)) {
        if (run.type === "icon") {
            pieces.push({ run, selected });
            continue;
        }
        for (const part of run.text.split(/([\uE000\uE001])/)) {
            if (part === SEL_START) {
                selected = true;
                caretFlags = run.flags;
                caretIndex = pieces.length;
            } else if (part === SEL_END) {
                selected = false;
                sawEnd = true;
            } else if (part) {
                pieces.push({ run: { ...run, text: part }, selected });
            }
        }
    }
    return caretFlags && sawEnd ? { pieces, caretFlags, caretIndex } : null;
}

/**
 * The run of repeated marker characters (`**`, `__`, `***`) that `index`
 * falls strictly inside, if any. A position there splits the marker.
 */
function markerAround(
    text: string,
    index: number,
): { from: number; to: number } | null {
    const char = text[index];
    if (!char || !"*_".includes(char) || text[index - 1] !== char) {
        return null;
    }
    let from = index - 1;
    while (from > 0 && text[from - 1] === char) from--;
    let to = index + 1;
    while (to < text.length && text[to] === char) to++;
    return { from, to };
}

/**
 * Inline styles active for a raw selection: at a caret, the styles of the
 * text it sits in; across a selection, the styles all of it shares.
 */
export function inlineStylesAt(
    text: string,
    start: number,
    end: number,
): TFlag[] {
    // A caret between a marker's characters would split it (`*|*` reads as
    // two italic markers), so check either side of the marker instead.
    const marker = start === end ? markerAround(text, start) : null;
    if (marker) {
        const before = inlineStylesAt(text, marker.from, marker.from);
        const after = inlineStylesAt(text, marker.to, marker.to);
        return INLINE_STYLES.filter(
            (style) => before.includes(style) || after.includes(style),
        );
    }
    const split = splitAtSelection(text, start, end);
    if (!split) return [];
    const runs = split.pieces
        .filter((piece) => piece.selected && piece.run.type === "text")
        .map((piece) => piece.run as { flags: TFlag[] });
    if (runs.length === 0) {
        return INLINE_STYLES.filter((style) =>
            split.caretFlags.includes(style),
        );
    }
    return INLINE_STYLES.filter((style) =>
        runs.every((run) => run.flags.includes(style)),
    );
}

/**
 * Toggles `flag` across the selected text: removed when all of it already
 * has the style, added otherwise. Works on parsed runs and rewrites the
 * line's markup, so overlapping or nested styles merge cleanly rather
 * than leaving stray markers. Returns the new text and selection.
 */
export function toggleInlineStyle(
    text: string,
    start: number,
    end: number,
    flag: TFlag,
): { text: string; start: number; end: number } {
    const split = splitAtSelection(text, start, end);
    // At a caret, act on the contiguous text that already has the style.
    if (split && start === end) selectStyledSpan(split, flag);
    const selected = split?.pieces.filter(
        (piece) => piece.selected && piece.run.type === "text",
    );
    if (!split || !selected?.length) {
        const marker = INLINE_MARKERS[flag] ?? "";
        return wrapSelection(text, start, end, marker, marker);
    }

    const remove = selected.every((piece) =>
        (piece.run as { flags: TFlag[] }).flags.includes(flag),
    );
    const runs: TInlineRun[] = [];
    let opened = false;
    split.pieces.forEach((piece, i) => {
        let run = piece.run;
        if (piece.selected && run.type === "text") {
            const flags = run.flags.filter((value) => value !== flag);
            run = { ...run, flags: remove ? flags : [...flags, flag] };
        }
        if (piece.selected && !opened) {
            runs.push(sentinel(run, SEL_START));
            opened = true;
        }
        runs.push(run);
        const next = split.pieces[i + 1];
        if (piece.selected && (!next || !next.selected)) {
            runs.push(sentinel(run, SEL_END));
        }
    });

    const markup = runsToMarkup(runs);
    const from = markup.indexOf(SEL_START);
    const to = markup.indexOf(SEL_END);
    return {
        text: markup.replace(SEL_START, "").replace(SEL_END, ""),
        start: from,
        end: to - 1,
    };
}

/** Marks the pieces around the caret that carry `flag` as selected. */
function selectStyledSpan(
    split: { pieces: IPiece[]; caretIndex: number },
    flag: TFlag,
) {
    const { pieces, caretIndex } = split;
    const styled = (piece?: IPiece) =>
        piece?.run.type === "text" && piece.run.flags.includes(flag);
    for (let i = caretIndex - 1; styled(pieces[i]); i--) {
        pieces[i].selected = true;
    }
    for (let i = caretIndex; styled(pieces[i]); i++) {
        pieces[i].selected = true;
    }
}

/** A sentinel styled like its neighbour, so it lands inside the same markers. */
function sentinel(neighbour: TInlineRun, char: string): TInlineRun {
    return neighbour.type === "text"
        ? { ...neighbour, text: char }
        : { type: "text", text: char, flags: [] };
}
