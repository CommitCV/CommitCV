import { parseInline } from "@resume/inline-markup";
import type { IResume, ISection } from "@resume/resume";
import type { TFlag } from "@resume/resume";

const MARKUP_SPECIALS = "#$*_@<>[]\\`~";

/** Escapes user text so it can never be interpreted as Typst markup. */
export function escapeMarkup(text: string): string {
    let out = "";
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === "/" && text[i + 1] === "/") {
            out += "\\/";
        } else if (MARKUP_SPECIALS.includes(c)) {
            out += `\\${c}`;
        } else {
            out += c;
        }
    }
    return out;
}

/** Escapes a URL for use inside a Typst string literal. */
export function escapeUrl(url: string): string {
    return url.replace(/["\\]/g, (c) => `\\${c}`);
}

/**
 * Generates the Typst source for a resume. The document imports the
 * `jake.typ` template and the vendored Font Awesome library, both
 * mapped into the compiler's in-memory file system at `/`.
 * With `standalone`, the imports are omitted so the template
 * definitions can be inlined above the body in an exported file.
 *
 * Every section is emitted through the template's own functions
 * (`custom-title`, `work-entry`, `split-entry`, `skills`, `bullets`), so new
 * section types should map onto one of those rather than raw markup.
 */
export function resumeToTypst(
    resume: IResume,
    options: { standalone?: boolean } = {},
): string {
    const parts = options.standalone
        ? []
        : [
              `#import "jake.typ": *`,
              `#import "fontawesome/lib.typ": fa-icon, fa-version`,
          ];
    parts.push(`#fa-version("6")`);

    const header = resume.sections.find(
        (section) => section.toggled && section.type === "header",
    );
    parts.push(showRule(header));

    for (const section of resume.sections) {
        if (section.toggled && section.type !== "header") {
            parts.push(sectionToTypst(section));
        }
    }
    return `${parts.join("\n\n")}\n`;
}

/** The template's `#show: resume.with(...)`, carrying the header. */
function showRule(header: ISection | undefined): string {
    const items = (header?.content ?? [])
        .filter((item) => item.toggled)
        .map((item) => `[${runsToTypst(item.text, item.flags)}]`);
    return [
        `#show: resume.with(`,
        `    top-margin: 0.45in,`,
        `    personal-info-font-size: 9.2pt,`,
        `    author-position: center,`,
        `    personal-info-position: center,`,
        `    author-name: "${escapeUrl(header?.title ?? "")}",`,
        `    contact-items: (`,
        ...items.map((item) => `        ${item},`),
        `    ),`,
        `)`,
    ].join("\n");
}

function sectionToTypst(section: ISection): string {
    const body = entriesToTypst(section);
    if (section.type.startsWith("sub-") || !section.title) return body;
    return [
        `#custom-title("${escapeUrl(section.title)}")[`,
        indent(body),
        `]`,
    ].join("\n");
}

/** A section's own entry followed by its toggled subsections. */
function entriesToTypst(section: ISection): string {
    const subs = section.subsections
        .filter((sub) => sub.toggled)
        .map(entriesToTypst);

    if (section.type.endsWith("two-split")) {
        return splitCall(section, "split-entry", 2, subs);
    }
    if (section.type.endsWith("four-text-split")) {
        return splitCall(section, "work-entry", 4, subs);
    }
    return [...fullTextBody(section), ...subs].join("\n");
}

/**
 * A heading row whose subsections (usually bullets) become the
 * template's entry body, mirroring `work-heading(...)[ - ... ]`.
 */
function splitCall(
    section: ISection,
    name: string,
    cells: number,
    subs: string[],
): string {
    const texts = section.content
        .filter((item) => item.toggled)
        .slice(0, cells)
        .map((item) => runsToTypst(item.text, item.flags));
    while (texts.length < cells) texts.push("");
    const body = subs.join("\n");
    return [
        `#${name}(`,
        ...texts.map((text) => `    [${text}],`),
        body ? `)[\n${indent(body)}\n]` : `)[]`,
    ].join("\n");
}

/**
 * Plain lines render as the template's marker-less `skills` list;
 * bullet lines render through `bullets`, styled like an entry body.
 * Consecutive lines of one kind are grouped into a single block.
 */
function fullTextBody(section: ISection): string[] {
    const groups: { bullet: boolean; lines: string[] }[] = [];
    for (const item of section.content) {
        if (!item.toggled) continue;
        const bullet = item.flags.includes("bullet");
        const line = `- ${runsToTypst(item.text, item.flags)}`;
        const last = groups.at(-1);
        if (last?.bullet === bullet) last.lines.push(line);
        else groups.push({ bullet, lines: [line] });
    }
    return groups.map(({ bullet, lines }) =>
        [
            `#${bullet ? "bullets" : "skills"}()[`,
            indent(lines.join("\n")),
            `]`,
        ].join("\n"),
    );
}

function indent(text: string): string {
    return text
        .split("\n")
        .map((line) => (line ? `    ${line}` : line))
        .join("\n");
}

function runsToTypst(text: string, editorFlags: TFlag[] = []): string {
    const runs = parseInline(text);
    const hasInlineTextStyle = runs.some(
        (run) =>
            run.type === "text" &&
            run.flags.some((flag) =>
                ["bold", "italics", "underline", "strikethrough"].includes(
                    flag,
                ),
            ),
    );
    // `bigger` is editor-only, so inline styling never overrides it.
    const fallbackFlags = hasInlineTextStyle
        ? editorFlags.filter((flag) => flag === "bigger")
        : editorFlags;

    return runs
        .map((run) => {
            if (run.type === "icon") {
                return `#fa-icon("${escapeUrl(run.name.slice(3))}")`;
            }
            const flags = [...new Set([...run.flags, ...fallbackFlags])];
            let body = escapeLineStarts(escapeMarkup(run.text));
            if (flags.includes("strikethrough")) {
                body = `#text(strike: true)[${body}]`;
            }
            if (flags.includes("underline")) {
                body = `#underline(offset: 0.3em)[${body}]`;
            }
            if (flags.includes("bigger")) {
                body = `#text(size: 13pt)[${body}]`;
            }
            if (flags.includes("italics")) body = `_${body}_`;
            if (flags.includes("bold")) body = `*${body}*`;
            if (run.href) {
                body = `#underline(offset: 0.3em)[#link("${escapeUrl(run.href)}")[${body}]]`;
            }
            return body;
        })
        .join("");
}

// Typst reads these, followed by a space at the start of a line, as a heading, list, or enum.
function escapeLineStarts(markup: string): string {
    return markup.replace(
        /(^|\n)([ \t]*)(?:([=\-+/])|(\d+)\.)(?=\s|$)/g,
        (_match, newline, indentation, marker, digits) =>
            marker
                ? `${newline}${indentation}\\${marker}`
                : `${newline}${indentation}${digits}\\.`,
    );
}
