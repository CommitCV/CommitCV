import { describe, expect, it } from "vitest";
import { mergeResume } from "./merge-resume";
import type { IResume, ISection } from "./resume";

const section = (title: string, text = "x"): ISection => ({
    title,
    type: "full-text",
    toggled: true,
    content: [{ text, flags: [], toggled: true }],
    subsections: [],
});
const resume = (sections: ISection[], filename = "cv", date = "01-01-26") =>
    ({ filename, date, schema_version: 1, sections }) as IResume;

const base = resume([section("A"), section("B"), section("C")]);

describe("mergeResume", () => {
    it("merges edits to different sections", () => {
        const ours = resume([section("A", "ours"), section("B"), section("C")]);
        const theirs = resume([section("A"), section("B"), section("C", "t")]);
        expect(mergeResume(base, ours, theirs)).toEqual(
            resume([section("A", "ours"), section("B"), section("C", "t")]),
        );
    });

    it("merges a field change on one side with a section edit on the other", () => {
        const ours = resume(base.sections, "renamed");
        const theirs = resume([section("A", "t"), section("B"), section("C")]);
        expect(mergeResume(base, ours, theirs)).toEqual(
            resume([section("A", "t"), section("B"), section("C")], "renamed"),
        );
    });

    it("takes identical changes from both sides", () => {
        const both = resume([section("A", "same"), section("B"), section("C")]);
        expect(mergeResume(base, both, both)).toEqual(both);
    });

    it("returns null when both edit the same section", () => {
        const ours = resume([section("A", "1"), section("B"), section("C")]);
        const theirs = resume([section("A", "2"), section("B"), section("C")]);
        expect(mergeResume(base, ours, theirs)).toBeNull();
    });

    it("returns null when both rename the file differently", () => {
        expect(
            mergeResume(
                base,
                resume(base.sections, "one"),
                resume(base.sections, "two"),
            ),
        ).toBeNull();
    });

    it("returns null for a structural change beside an edit", () => {
        const ours = resume([section("A"), section("B")]);
        const theirs = resume([section("A", "t"), section("B"), section("C")]);
        expect(mergeResume(base, ours, theirs)).toBeNull();
    });

    it("applies a structural change when the other side left sections alone", () => {
        const ours = resume(base.sections, "renamed");
        const theirs = resume([section("A"), section("B")]);
        expect(mergeResume(base, ours, theirs)?.sections).toHaveLength(2);
    });
});
