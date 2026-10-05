import { describe, expect, it } from "vitest";
import { parseResume, ResumeParseError } from "./parse-resume";
import sample from "./sample-resume.json";

type Json = Record<string | number, unknown>;

function sampleObject(): Json {
    return structuredClone(sample) as unknown as Json;
}

function at(obj: Json, path: (string | number)[]): Json {
    let node: unknown = obj;
    for (const key of path) {
        node = (node as Json)[key as string];
    }
    return node as Json;
}

function deleteAt(obj: Json, path: (string | number)[]): void {
    delete at(obj, path.slice(0, -1))[path[path.length - 1] as string];
}

function setAt(obj: Json, path: (string | number)[], value: unknown): void {
    at(obj, path.slice(0, -1))[path[path.length - 1] as string] = value;
}

function showPath(path: (string | number)[]): string {
    let out = "";
    for (const key of path) {
        out += typeof key === "number" ? `[${key}]` : out ? `.${key}` : key;
    }
    return out;
}

describe("parseResume", () => {
    it("parses the real user sample", () => {
        const resume = parseResume(sample);
        expect(resume.filename).toBe("Resume1");
        expect(resume.sections).toHaveLength(4);
        expect(resume.sections[0].type).toBe("header");
        expect(resume.sections[1].type).toBe("four-text-split");
        expect(resume.sections[3].subsections[0].type).toBe(
            "sub-four-text-split",
        );
    });

    it.each([
        ["root filename", ["filename"]],
        ["root date", ["date"]],
        ["root schema_version", ["schema_version"]],
        ["root sections", ["sections"]],
        ["section title", ["sections", 0, "title"]],
        ["section type", ["sections", 0, "type"]],
        ["section toggled", ["sections", 0, "toggled"]],
        ["text text", ["sections", 0, "content", 0, "text"]],
        [
            "nested section toggled",
            ["sections", 3, "subsections", 0, "toggled"],
        ],
    ])("rejects a missing %s with its exact path", (_name, path) => {
        const bad = sampleObject();
        deleteAt(bad, path);
        try {
            parseResume(bad);
            expect.unreachable("should have thrown");
        } catch (err) {
            expect(err).toBeInstanceOf(ResumeParseError);
            expect((err as ResumeParseError).path).toBe(showPath(path));
        }
    });

    it("rejects an unknown section type", () => {
        const bad = sampleObject();
        setAt(bad, ["sections", 0, "type"], "header-plus");
        expect(() => parseResume(bad)).toThrow(
            /sections\[0\]\.type: unknown type "header-plus"/,
        );
    });

    it("rejects a newer schema version", () => {
        const bad = sampleObject();
        setAt(bad, ["schema_version"], 2);
        expect(() => parseResume(bad)).toThrow(/schema_version: expected 1/);
    });

    it.each([null, [], "x", 42])("rejects non-object input %#", (input) => {
        expect(() => parseResume(input)).toThrow(/resume: expected an object/);
    });

    it("rejects an unknown flag", () => {
        const bad = sampleObject();
        setAt(bad, ["sections", 0, "content", 0, "flags", 0], "sparkly");
        expect(() => parseResume(bad)).toThrow(
            /sections\[0\]\.content\[0\]\.flags\[0\]: unknown flag "sparkly"/,
        );
    });

    it("defaults optional collections", () => {
        const minimal = {
            filename: "x",
            date: "01-01-25",
            schema_version: 1,
            sections: [{ title: "Header", type: "header", toggled: true }],
        };
        const resume = parseResume(minimal);
        expect(resume.sections[0].content).toEqual([]);
        expect(resume.sections[0].subsections).toEqual([]);
        expect(resume.sections[0].content).toEqual([]);
    });
});
