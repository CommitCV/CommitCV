import type { TFlag } from "./resume";

export type TInlineRun =
    | { type: "text"; text: string; flags: TFlag[]; href?: string }
    | { type: "icon"; name: string };

const MARKERS: [TFlag, string][] = [
    ["bold", "**"],
    ["underline", "__"],
    ["strikethrough", "~~"],
    ["italics", "*"],
];

const ICON_NAME = /^fa-[a-z0-9-]+$/;

const SAFE_SCHEMES = ["http", "https", "mailto", "tel"];

/**
 * Parses resume text into styled runs. Supported inline syntax:
 * `**bold**`, `*italics*`, `__underline__`, `~~strikethrough~~`,
 * `[label](url)`, `$fa-icon-name$`.
 * Malformed markup falls back to literal text.
 */
export function parseInline(text: string): TInlineRun[] {
    return parseSeq(text, 0, [], null).runs;
}

function parseSeq(
    s: string,
    start: number,
    flags: TFlag[],
    closer: string | null,
): { runs: TInlineRun[]; end: number; closed: boolean } {
    const runs: TInlineRun[] = [];
    let text = "";
    let i = start;

    const flush = () => {
        if (text) {
            runs.push({ type: "text", text, flags: [...flags] });
            text = "";
        }
    };

    while (i < s.length) {
        if (closer && s.startsWith(closer, i)) {
            flush();
            return { runs, end: i + closer.length, closed: true };
        }

        if (s[i] === "$") {
            const close = s.indexOf("$", i + 1);
            if (close !== -1 && ICON_NAME.test(s.slice(i + 1, close))) {
                flush();
                runs.push({ type: "icon", name: s.slice(i + 1, close) });
                i = close + 1;
                continue;
            }
        }

        if (s[i] === "[") {
            const link = tryLink(s, i, flags);
            if (link) {
                flush();
                runs.push(...link.runs);
                i = link.end;
                continue;
            }
        }

        const marker = MARKERS.find(
            ([flag, m]) => s.startsWith(m, i) && !flags.includes(flag),
        );
        if (marker) {
            const [flag, m] = marker;
            const inner = parseSeq(s, i + m.length, [...flags, flag], m);
            if (inner.closed) {
                flush();
                runs.push(...inner.runs);
                i = inner.end;
                continue;
            }
            // Unclosed marker: emit it literally and rescan the rest.
            text += m;
            i += m.length;
            continue;
        }

        text += s[i];
        i += 1;
    }
    flush();
    return { runs, end: i, closed: false };
}

function tryLink(
    s: string,
    i: number,
    flags: TFlag[],
): { runs: TInlineRun[]; end: number } | null {
    const close = s.indexOf("]", i + 1);
    if (close === -1 || s[close + 1] !== "(") return null;
    const urlEnd = s.indexOf(")", close + 2);
    if (urlEnd === -1) return null;
    const url = s.slice(close + 2, urlEnd);
    if (!url || !hasSafeScheme(url)) return null;

    const label = s.slice(i + 1, close);
    const runs = parseSeq(label, 0, [...flags, "link"], null).runs.map((run) =>
        run.type === "text" ? { ...run, href: url } : run,
    );
    return { runs, end: urlEnd + 1 };
}

// Browsers ignore whitespace and control characters inside a scheme.
function hasSafeScheme(url: string): boolean {
    const compact = [...url].filter((c) => c.charCodeAt(0) > 32).join("");
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1];
    return !scheme || SAFE_SCHEMES.includes(scheme.toLowerCase());
}
