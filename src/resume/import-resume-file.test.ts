import { describe, expect, it } from "vitest";
import { importResumeFile } from "./import-resume-file";
import { ResumeParseError } from "./parse-resume";
import legacy from "./legacy-resume.fixture.json";
import sample from "./sample-resume.json";

function file(name: string, content: unknown) {
    return new File(
        [typeof content === "string" ? content : JSON.stringify(content)],
        name,
    );
}

describe("importResumeFile", () => {
    it("parses a current resume", async () => {
        const resume = await importResumeFile(file("a.json", sample));
        expect(resume.filename).toBe(sample.filename);
    });

    it("migrates a legacy resume and names it after the file", async () => {
        const resume = await importResumeFile(file("old-cv.JSON", legacy));
        expect(resume.filename).toBe("old-cv");
    });

    it("rejects text that is not JSON", async () => {
        await expect(
            importResumeFile(file("bad.json", "{nope")),
        ).rejects.toThrow("bad.json is not valid JSON");
    });

    it("rejects JSON that is not a resume", async () => {
        await expect(
            importResumeFile(file("x.json", { hello: "world" })),
        ).rejects.toBeInstanceOf(ResumeParseError);
    });
});
