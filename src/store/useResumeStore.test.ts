import { beforeEach, describe, expect, it } from "vitest";
import type { IResume } from "@resume/resume";
import type { IResumeEntry, IResumeStorage } from "@storage/resume-storage";
import starter from "@resume/starter-resume.json";
import { resumeStorages, useResumeStore } from "./useResumeStore";

class FakeStorage implements IResumeStorage {
    saved: { id: string; resume: IResume; message?: string }[] = [];
    fail = false;

    async list(): Promise<IResumeEntry[]> {
        return [];
    }
    async load(): Promise<IResume> {
        throw new Error("unused");
    }
    async save(id: string, resume: IResume, message?: string): Promise<void> {
        if (this.fail) throw new Error("disk full");
        this.saved.push({ id, resume, message });
    }
    async remove(): Promise<void> {}
}

describe("useResumeStore", () => {
    const local = new FakeStorage();
    const github = new FakeStorage();

    beforeEach(() => {
        local.saved = [];
        github.saved = [];
        local.fail = false;
        resumeStorages.local = local;
        resumeStorages.github = () => github;
        useResumeStore
            .getState()
            .load(makeResume(), { kind: "local", id: "r1" });
    });

    it("sends saves to the storage matching the source", async () => {
        await useResumeStore.getState().save("my message");
        expect(local.saved).toHaveLength(1);
        expect(local.saved[0]).toMatchObject({
            id: "r1",
            message: "my message",
        });
    });

    it("sends github saves to the repo storage with the path as id", async () => {
        useResumeStore.getState().load(makeResume(), {
            kind: "github",
            repo: "travis/cv",
            path: "resume.json",
        });
        await useResumeStore.getState().save();
        expect(github.saved).toHaveLength(1);
        expect(github.saved[0]?.id).toBe("resume.json");
    });

    it("marks dirty on edits and clean after a save", async () => {
        useResumeStore.getState().setFilename("renamed");
        expect(useResumeStore.getState().saveState).toBe("dirty");
        await useResumeStore.getState().save();
        expect(useResumeStore.getState().saveState).toBe("clean");
        expect(useResumeStore.getState().resume?.filename).toBe("renamed");
    });

    it("keeps the draft and marks error when a save rejects", async () => {
        useResumeStore.getState().setFilename("keep me");
        local.fail = true;
        await useResumeStore.getState().save();
        const state = useResumeStore.getState();
        expect(state.saveState).toBe("error");
        expect(state.saveError).toMatch(/disk full/);
        expect(state.resume?.filename).toBe("keep me");
    });

    it("assigns a local id when saving a brand new resume", async () => {
        useResumeStore.getState().newResume();
        expect(useResumeStore.getState().resume?.sections).toHaveLength(5);
        await useResumeStore.getState().save();
        const source = useResumeStore.getState().source;
        if (source?.kind !== "local") {
            throw new Error("expected a local source");
        }
        expect(source.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(local.saved[0]?.id).toBe(source.id);
    });

    it("edits nested text without mutating the previous resume", () => {
        useResumeStore.getState().updateText([2, 0, 0], 0, { text: "changed" });
        const state = useResumeStore.getState();
        expect(state.saveState).toBe("dirty");
        const experience = state.resume?.sections[2];
        expect(
            experience?.subsections[0]?.subsections[0]?.content[0].text,
        ).toBe("changed");
    });

    describe("section expansion", () => {
        it("moves a section's open state, and its children's, with it", () => {
            const store = useResumeStore.getState();
            store.setExpanded([1], true);
            store.setExpanded([1, 0], true);
            store.setExpanded([2], false);

            useResumeStore.getState().moveSection([1], 1);

            expect(useResumeStore.getState().expanded).toEqual({
                "2": true,
                "2.0": true,
                "1": false,
            });
        });

        it("keeps the open state of siblings after a removal", () => {
            const store = useResumeStore.getState();
            store.setExpanded([0], true);
            store.setExpanded([1], false);
            store.setExpanded([2], true);
            store.setExpanded([2, 0], true);

            useResumeStore.getState().removeSection([1]);

            expect(useResumeStore.getState().expanded).toEqual({
                "0": true,
                "1": true,
                "1.0": true,
            });
        });

        it("leaves open state alone when a move is out of range", () => {
            useResumeStore.getState().setExpanded([0], true);
            useResumeStore.getState().moveSection([0], -1);
            expect(useResumeStore.getState().expanded).toEqual({ "0": true });
        });

        it("starts closed after loading another resume", () => {
            useResumeStore.getState().setExpanded([1], true);
            useResumeStore
                .getState()
                .load(makeResume(), { kind: "local", id: "r2" });
            expect(useResumeStore.getState().expanded).toEqual({});
        });
    });
});

function makeResume(): IResume {
    return structuredClone(starter) as unknown as IResume;
}
