import { parseInline, type TInlineRun } from "./inline-markup";
import type { TFlag } from "./resume";

/** Styles a formatted text field can show and write back as markup. */
export const INLINE_STYLES = [
    "bold",
    "italics",
    "underline",
    "strikethrough",
] as const satisfies TFlag[];

type TInlineStyle = (typeof INLINE_STYLES)[number];

// Outermost first, so `**_x_**`-style nesting reparses to the same runs.
const MARKUP: Record<TInlineStyle, string> = {
    bold: "**",
    underline: "__",
    strikethrough: "~~",
    italics: "*",
};

const HTML_TAGS: Record<TInlineStyle, string> = {
    bold: "b",
    italics: "i",
    underline: "u",
    strikethrough: "s",
};

/** Renders markup as HTML for a formatted (contenteditable) text field. */
export function markupToHtml(markup: string): string {
    return parseInline(markup)
        .map((run) => {
            if (run.type === "icon") {
                return `<span contenteditable="false" data-icon="${escapeHtml(run.name)}">$${escapeHtml(run.name)}$</span>`;
            }
            let html = escapeHtml(run.text);
            for (const style of INLINE_STYLES) {
                if (run.flags.includes(style)) {
                    html = `<${HTML_TAGS[style]}>${html}</${HTML_TAGS[style]}>`;
                }
            }
            return run.href
                ? `<a href="${escapeHtml(run.href)}">${html}</a>`
                : html;
        })
        .join("");
}

/** Writes runs back as markup, merging neighbours that share a style. */
export function runsToMarkup(runs: TInlineRun[]): string {
    const merged: TInlineRun[] = [];
    for (const run of runs) {
        const last = merged.at(-1);
        if (
            run.type === "text" &&
            last?.type === "text" &&
            last.href === run.href &&
            sameStyles(last.flags, run.flags)
        ) {
            merged[merged.length - 1] = { ...last, text: last.text + run.text };
        } else if (run.type === "icon" || run.text) {
            merged.push(run);
        }
    }

    // Consecutive runs inside one link share a single `[label](href)`.
    let out = "";
    let i = 0;
    while (i < merged.length) {
        const run = merged[i];
        if (run.type === "icon") {
            out += `$${run.name}$`;
            i += 1;
            continue;
        }
        if (!run.href) {
            out += styled(run.text, run.flags);
            i += 1;
            continue;
        }
        let label = "";
        const href = run.href;
        while (
            i < merged.length &&
            merged[i].type === "text" &&
            (merged[i] as { href?: string }).href === href
        ) {
            const linked = merged[i] as { text: string; flags: TFlag[] };
            label += styled(linked.text, linked.flags);
            i += 1;
        }
        out += `[${label}](${href})`;
    }
    return out;
}

function styled(text: string, flags: TFlag[]): string {
    // Markers can't hug whitespace, so keep edge spaces outside them.
    const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
    if (!core) return text;
    let inner = core;
    // Wrap innermost first, following `MARKUP`'s outermost-first order.
    for (const style of (Object.keys(MARKUP) as TInlineStyle[]).reverse()) {
        if (flags.includes(style)) {
            inner = `${MARKUP[style]}${inner}${MARKUP[style]}`;
        }
    }
    return `${lead}${inner}${trail}`;
}

function sameStyles(a: TFlag[], b: TFlag[]): boolean {
    return INLINE_STYLES.every(
        (style) => a.includes(style) === b.includes(style),
    );
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
