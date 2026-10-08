import { parseResume, ResumeParseError } from "./parse-resume";
import type { IResume, IResumeText, ISection } from "./resume";
import { SCHEMA_VERSION } from "./resume";

/**
 * Old CommitCV files predate the schema: a `header` object plus sections
 * holding `bulletCollection`/`paragraphCollection` entries, and no
 * `schema_version`. `parseResume` rejects those, so uploads are detected
 * here and migrated before they enter the editor.
 */
export function isLegacyResume(input: unknown): boolean {
    if (typeof input !== "object" || input === null) return false;
    const record = input as Record<string, unknown>;
    return (
        record.schema_version === undefined &&
        typeof record.header === "object" &&
        record.header !== null &&
        Array.isArray(record.sections)
    );
}

/**
 * Converts a legacy file into the current schema. Bold/normal pairs become
 * the `**bold** normal` inline markup the editor itself writes, and each
 * subsection becomes a heading row with its bullets in a child section.
 * The result is validated by `parseResume` before it is returned.
 */
export function migrateLegacyResume(
    input: unknown,
    meta: { filename: string; date: string },
): IResume {
    const root = expectObject(input, "resume");
    const header = expectObject(root.header, "header");
    const sections = expectArray(root.sections, "sections");
    return parseResume({
        filename: meta.filename,
        date: meta.date,
        schema_version: SCHEMA_VERSION,
        sections: [
            {
                title: expectString(header.name, "header.name"),
                type: "header",
                toggled: true,
                content: parseSubheaders(header.subheaders),
                subsections: [],
            },
            ...sections.map((section, index) =>
                parseSection(section, `sections[${index}]`),
            ),
        ],
    });
}

/** Contact items: plain text, or a link when the legacy item had one. */
function parseSubheaders(input: unknown): IResumeText[] {
    if (input === undefined) return [];
    return expectArray(input, "header.subheaders").map(
        (item, index): IResumeText => {
            const path = `header.subheaders[${index}]`;
            const record = expectObject(item, path);
            const text = expectString(record.text, `${path}.text`);
            const link = optionalString(record.link, `${path}.link`);
            return {
                text: link === undefined ? text : `[${text}](${link})`,
                flags: link === undefined ? [] : ["link"],
                toggled: true,
            };
        },
    );
}

/** A legacy section becomes a titled section carrying its subsections. */
function parseSection(input: unknown, path: string): ISection {
    const record = expectObject(input, path);
    const subsections =
        record.subsections === undefined
            ? []
            : expectArray(record.subsections, `${path}.subsections`);
    return {
        title: expectString(record.name, `${path}.name`),
        type: "full-text",
        toggled: true,
        content: parseCollections(record, path),
        subsections: subsections.map((subsection, index) =>
            parseSubsection(subsection, `${path}.subsections[${index}]`),
        ),
    };
}

/**
 * A subsection becomes a heading row: title and date over subtitle and
 * location, falling back to a single title/date row when neither is
 * present. Its bullets and paragraphs move into one child section, the
 * same shape the editor uses for bullet lists.
 */
function parseSubsection(input: unknown, path: string): ISection {
    const record = expectObject(input, path);
    const title = expectString(record.title, `${path}.title`);
    const date = optionalString(record.date, `${path}.date`) ?? "";
    const subtitle = optionalString(record.subtitle, `${path}.subtitle`);
    const location = optionalString(record.location, `${path}.location`);
    const link = optionalString(record.link, `${path}.link`);
    const boldTitle =
        link === undefined ? `**${title}**` : `[**${title}**](${link})`;
    const secondRow = subtitle !== undefined || location !== undefined;

    const content: IResumeText[] = secondRow
        ? [
              cell(boldTitle),
              cell(date),
              cell(italic(subtitle ?? "")),
              cell(italic(location ?? "")),
          ]
        : [cell(boldTitle), cell(date)];

    const entries = parseCollections(record, path);
    return {
        title: "",
        type: secondRow ? "sub-four-text-split" : "sub-two-split",
        toggled: true,
        content,
        subsections: entries.length
            ? [
                  {
                      title: "",
                      type: "sub-full-text",
                      toggled: true,
                      content: entries,
                      subsections: [],
                  },
              ]
            : [],
    };
}

/** Bullet entries first, then paragraphs, matching the legacy render order. */
function parseCollections(
    record: Record<string, unknown>,
    path: string,
): IResumeText[] {
    return [
        ...parseItems(
            record.bulletCollection,
            `${path}.bulletCollection`,
            true,
        ),
        ...parseItems(
            record.paragraphCollection,
            `${path}.paragraphCollection`,
            false,
        ),
    ];
}

/** Each `bold`/`normal` pair becomes one line of `**bold** normal` markup. */
function parseItems(
    input: unknown,
    path: string,
    bullet: boolean,
): IResumeText[] {
    if (input === undefined) return [];
    const items: IResumeText[] = [];
    expectArray(input, path).forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        const record = expectObject(item, itemPath);
        const bold = optionalString(record.bold, `${itemPath}.bold`);
        const normal = optionalString(record.normal, `${itemPath}.normal`);
        if (bold === undefined && normal === undefined) return;
        const text =
            bold === undefined
                ? normal!
                : `**${bold}**${normal === undefined ? "" : ` ${normal}`}`;
        items.push({
            text,
            flags: bullet ? ["bullet"] : [],
            toggled: true,
        });
    });
    return items;
}

/** A heading-row cell; empty cells keep the grid shape. */
function cell(text: string): IResumeText {
    return { text, flags: [], toggled: true };
}

/** Subtitle and location sit on the second row in italics. */
function italic(text: string): string {
    return text === "" ? text : `*${text}*`;
}

function expectObject(input: unknown, path: string): Record<string, unknown> {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
        throw new ResumeParseError(path, "expected an object");
    }
    return input as Record<string, unknown>;
}

function expectArray(input: unknown, path: string): unknown[] {
    if (!Array.isArray(input)) {
        throw new ResumeParseError(path, "expected an array");
    }
    return input;
}

function expectString(input: unknown, path: string): string {
    if (typeof input !== "string") {
        throw new ResumeParseError(path, "expected a string");
    }
    return input;
}

function optionalString(input: unknown, path: string): string | undefined {
    return input === undefined ? undefined : expectString(input, path);
}
