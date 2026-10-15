import type {
    IResume,
    IResumeText,
    ISection,
    TFlag,
    TSectionType,
} from "./resume";
import { SCHEMA_VERSION } from "./resume";

export class ResumeParseError extends Error {
    public readonly path: string;
    public readonly reason: string;

    constructor(path: string, reason: string) {
        super(`${path}: ${reason}`);
        this.name = "ResumeParseError";
        this.path = path;
        this.reason = reason;
    }
}

const FLAGS: TFlag[] = [
    "bold",
    "italics",
    "underline",
    "strikethrough",
    "link",
    "icon",
    "bullet",
    "bigger",
];

const SECTION_TYPES: TSectionType[] = [
    "header",
    "full-text",
    "two-split",
    "four-text-split",
    "sub-full-text",
    "sub-two-split",
    "sub-four-text-split",
];

/**
 * Validates untrusted resume JSON (uploads, storage) and returns it
 * typed. Throws `ResumeParseError` naming the path of the first bad
 * value. `content`, `subsections` and `flags` default to empty;
 * everything else is required.
 */
export function parseResume(input: unknown): IResume {
    const root = expectObject(input, "resume");
    return {
        filename: expectString(root.filename, "filename"),
        date: expectString(root.date, "date"),
        schema_version: expectSchemaVersion(root.schema_version),
        sections: parseSections(root.sections, "sections"),
    };
}

function parseSections(input: unknown, path: string): ISection[] {
    if (!Array.isArray(input)) {
        throw new ResumeParseError(path, "expected an array");
    }
    return input.map((section, i) => parseSection(section, `${path}[${i}]`));
}

function parseSection(input: unknown, path: string): ISection {
    const o = expectObject(input, path);
    const type = expectString(o.type, `${path}.type`);
    if (!SECTION_TYPES.includes(type as TSectionType)) {
        throw new ResumeParseError(`${path}.type`, `unknown type "${type}"`);
    }
    return {
        title: expectString(o.title, `${path}.title`),
        type: type as TSectionType,
        toggled: expectBoolean(o.toggled, `${path}.toggled`),
        content:
            o.content === undefined
                ? []
                : parseTexts(o.content, `${path}.content`),
        subsections:
            o.subsections === undefined
                ? []
                : parseSections(o.subsections, `${path}.subsections`),
    };
}

function parseTexts(input: unknown, path: string): IResumeText[] {
    if (!Array.isArray(input)) {
        throw new ResumeParseError(path, "expected an array");
    }
    return input.map((text, i) => parseText(text, `${path}[${i}]`));
}

function parseText(input: unknown, path: string): IResumeText {
    const o = expectObject(input, path);
    const flags: TFlag[] = [];
    if (o.flags !== undefined) {
        if (!Array.isArray(o.flags)) {
            throw new ResumeParseError(`${path}.flags`, "expected an array");
        }
        o.flags.forEach((flag, i) => {
            if (!FLAGS.includes(flag as TFlag)) {
                throw new ResumeParseError(
                    `${path}.flags[${i}]`,
                    `unknown flag "${String(flag)}"`,
                );
            }
            flags.push(flag as TFlag);
        });
    }
    return {
        text: expectString(o.text, `${path}.text`),
        flags,
        toggled:
            o.toggled === undefined
                ? true
                : expectBoolean(o.toggled, `${path}.toggled`),
    };
}

function expectObject(input: unknown, path: string): Record<string, unknown> {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
        throw new ResumeParseError(path, "expected an object");
    }
    return input as Record<string, unknown>;
}

function expectString(input: unknown, path: string): string {
    if (typeof input !== "string") {
        throw new ResumeParseError(path, "expected a string");
    }
    return input;
}

function expectBoolean(input: unknown, path: string): boolean {
    if (typeof input !== "boolean") {
        throw new ResumeParseError(path, "expected a boolean");
    }
    return input;
}

function expectSchemaVersion(input: unknown): number {
    if (input !== SCHEMA_VERSION) {
        throw new ResumeParseError(
            "schema_version",
            `expected ${SCHEMA_VERSION}, got ${String(input)}`,
        );
    }
    return SCHEMA_VERSION;
}
