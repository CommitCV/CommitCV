import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TDragItem, TDropTarget } from "@resume/drag-drop";
import type { IResume, ISection } from "@resume/resume";
import type { IResumeEntry, IResumeStorage } from "@storage/resume-storage";
import starter from "@resume/starter-resume.json";
import { resumeStorages, useResumeStore } from "./useResumeStore";
import {
    ConflictError,
    UnauthorizedError,
} from "@storage/github-resume-storage";
import { SessionDivergedError } from "@storage/git-resume-storage";

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

    it("sends git saves to the connection's storage with the path as id", async () => {
        const git = new FakeStorage();
        resumeStorages.git = (id) => (id === "c1" ? git : local);
        useResumeStore.getState().load(makeResume(), {
            kind: "git",
            connectionId: "c1",
            path: "cv.json",
        });
        await useResumeStore.getState().save("msg");
        expect(git.saved).toEqual([
            expect.objectContaining({ id: "cv.json", message: "msg" }),
        ]);
        expect(local.saved).toHaveLength(0);
    });

    describe("git sessions", () => {
        class FakeGit extends FakeStorage {
            sessions: IResume[] = [];
            commits: { force?: boolean }[] = [];
            error: Error | null = null;
            remote: IResume | null = makeResume();
            forced: boolean[] = [];
            async saveSession(
                _id: string,
                resume: IResume,
                o: { force?: boolean } = {},
            ) {
                if (this.error) throw this.error;
                this.forced.push(!!o.force);
                this.sessions.push(resume);
            }
            async findSessions() {
                return [{ local: {} }];
            }
            async resolveSession() {
                return this.remote;
            }
            async commit(
                _id: string,
                _r: IResume,
                o: { force?: boolean } = {},
            ) {
                if (this.error) throw this.error;
                this.commits.push(o);
            }
            async save(id: string, resume: IResume, message?: string) {
                await this.commit(id, resume);
                await super.save(id, resume, message);
            }
            async discardSession() {
                return this.remote;
            }
        }
        let git: FakeGit;
        beforeEach(() => {
            git = new FakeGit();
            resumeStorages.git = () => git;
            useResumeStore.getState().load(makeResume(), {
                kind: "git",
                connectionId: "c1",
                path: "cv.json",
            });
            useResumeStore.getState().setFilename("edited");
        });

        it("autosaves to the session and keeps the commit state separate", async () => {
            expect(await useResumeStore.getState().autosave()).toBe("ok");
            const state = useResumeStore.getState();
            expect(git.sessions).toHaveLength(1);
            expect(git.saved).toHaveLength(0);
            expect(state.saveState).toBe("clean");
            expect(state.sync.autosavedAt).not.toBeNull();
            await state.save();
            expect(useResumeStore.getState().sync.autosavedAt).toBeNull();
        });

        it("does not autosave local resumes", async () => {
            useResumeStore
                .getState()
                .load(makeResume(), { kind: "local", id: "r1" });
            expect(await useResumeStore.getState().autosave()).toBe("skip");
        });

        it("reports retry and auth failures and keeps the edit dirty", async () => {
            git.error = new Error("offline");
            expect(await useResumeStore.getState().autosave()).toBe("retry");
            expect(useResumeStore.getState().sync.phase).toBe("retrying");
            expect(useResumeStore.getState().saveState).toBe("dirty");
            git.error = new UnauthorizedError();
            expect(await useResumeStore.getState().autosave()).toBe("auth");
            expect(useResumeStore.getState().sync.phase).toBe("auth");
        });

        it("turns a commit conflict into a prompt, then resolves it", async () => {
            git.error = new ConflictError();
            await useResumeStore.getState().save();
            expect(useResumeStore.getState().sync.phase).toBe("conflict");
            expect(useResumeStore.getState().saveState).toBe("dirty");
            expect(await useResumeStore.getState().autosave()).toBe("skip");
            git.error = null;
            await useResumeStore.getState().resolveConflict("mine");
            expect(git.commits).toEqual([{ force: true }]);
            expect(useResumeStore.getState().sync.phase).toBe("idle");
            expect(useResumeStore.getState().saveState).toBe("clean");
        });

        it("pauses autosave when the session moved elsewhere", async () => {
            git.error = new SessionDivergedError();
            expect(await useResumeStore.getState().autosave()).toBe("skip");
            expect(useResumeStore.getState().sync.phase).toBe("diverged");
            expect(useResumeStore.getState().saveState).toBe("dirty");
            git.error = null;
            expect(await useResumeStore.getState().autosave()).toBe("skip");
            expect(git.sessions).toHaveLength(0);
        });

        it("keep my version force-pushes only on that choice", async () => {
            git.error = new SessionDivergedError();
            await useResumeStore.getState().autosave();
            git.error = null;
            await useResumeStore.getState().resolveDivergence("mine");
            expect(git.forced).toEqual([true]);
            const state = useResumeStore.getState();
            expect(state.sync.phase).toBe("idle");
            expect(state.saveState).toBe("clean");
            expect(state.resume?.filename).toBe("edited");
        });

        it("use remote version loads the session as pushed", async () => {
            git.error = new SessionDivergedError();
            await useResumeStore.getState().autosave();
            git.error = null;
            git.remote = { ...makeResume(), filename: "theirs" };
            await useResumeStore.getState().resolveDivergence("remote");
            const state = useResumeStore.getState();
            expect(state.resume?.filename).toBe("theirs");
            expect(state.sync.phase).toBe("idle");
            expect(git.forced).toEqual([]);
        });

        it("take remote loads the default branch version", async () => {
            git.error = new ConflictError();
            await useResumeStore.getState().save();
            git.remote = { ...makeResume(), filename: "theirs" };
            await useResumeStore.getState().resolveConflict("remote");
            const state = useResumeStore.getState();
            expect(state.resume?.filename).toBe("theirs");
            expect(state.saveState).toBe("clean");
            expect(state.sync.phase).toBe("idle");
        });
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

    it("stays dirty when an edit lands while saving", async () => {
        const saving = useResumeStore.getState().save();
        useResumeStore.getState().setFilename("during save");
        await saving;
        expect(useResumeStore.getState().saveState).toBe("dirty");
    });

    it("leaves a new resume clean until it is edited", () => {
        useResumeStore.getState().newResume();
        expect(useResumeStore.getState().saveState).toBe("clean");
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

    describe("undo and redo", () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        const state = () => useResumeStore.getState();
        const firstText = () =>
            state().resume?.sections[2]?.subsections[0]?.subsections[0]
                ?.content[0]?.text;

        it("undoes and redoes a text edit", () => {
            const original = firstText();
            state().updateText([2, 0, 0], 0, { text: "changed" });
            state().undo();
            expect(firstText()).toBe(original);
            expect(state().saveState).toBe("dirty");
            state().redo();
            expect(firstText()).toBe("changed");
        });

        it("folds quick typing in one field into one step", () => {
            vi.useFakeTimers();
            const original = firstText();
            state().updateText([2, 0, 0], 0, { text: "a" });
            vi.advanceTimersByTime(500);
            state().updateText([2, 0, 0], 0, { text: "ab" });
            vi.advanceTimersByTime(1500);
            state().updateText([2, 0, 0], 0, { text: "abc" });

            state().undo();
            expect(firstText()).toBe("ab");
            state().undo();
            expect(firstText()).toBe(original);
            expect(state().past).toHaveLength(0);
        });

        it("keeps separate fields and flag changes as their own steps", () => {
            state().setFilename("one");
            state().updateText([2, 0, 0], 0, { text: "x" });
            state().updateText([2, 0, 0], 0, { flags: ["bold"] });
            state().updateText([2, 0, 0], 0, { flags: [] });
            expect(state().past).toHaveLength(4);
        });

        it.each([
            ["addSection", () => state().addSection([], makeSection())],
            ["removeSection", () => state().removeSection([1])],
            ["moveSection", () => state().moveSection([1], 1)],
            [
                "addText",
                () =>
                    state().addText([1], {
                        text: "new",
                        flags: [],
                        toggled: true,
                    }),
            ],
            ["removeText", () => state().removeText([1], 0)],
            [
                "updateSection toggle",
                () => state().updateSection([1], { toggled: false }),
            ],
        ])("undoes %s", (_name, action) => {
            const before = state().resume;
            action();
            expect(state().resume).not.toEqual(before);
            state().undo();
            expect(state().resume).toEqual(before);
        });

        it("undoes a drop", () => {
            const before = state().resume;
            state().setDragItem({ kind: "section", path: [4] });
            state().setDropTarget({
                kind: "section",
                path: [1],
                position: "before",
            });
            state().drop();
            expect(state().resume?.sections[1]?.title).toBe("Technical Skills");
            state().undo();
            expect(state().resume).toEqual(before);
        });

        it("restores which sections were open", () => {
            state().setExpanded([1], true);
            state().removeSection([1]);
            expect(state().expanded).toEqual({});
            state().undo();
            expect(state().expanded).toEqual({ "1": true });
        });

        it("drops the redo stack after a new edit", () => {
            state().setFilename("one");
            state().undo();
            expect(state().future).toHaveLength(1);
            state().removeSection([1]);
            expect(state().future).toHaveLength(0);
        });

        it("caps the history at 100 steps", () => {
            for (let i = 0; i < 120; i++) {
                state().updateSection([1], { toggled: i % 2 === 0 });
            }
            expect(state().past).toHaveLength(100);
        });

        it("does nothing with empty stacks", () => {
            const before = state().resume;
            state().undo();
            state().redo();
            expect(state().resume).toBe(before);
            expect(state().saveState).toBe("clean");
        });

        it("records nothing for an out-of-range move", () => {
            state().moveSection([0], -1);
            expect(state().past).toHaveLength(0);
        });

        it.each<[string, TDragItem, TDropTarget]>([
            [
                "text before itself",
                { kind: "text", path: [1], index: 0 },
                { kind: "text", path: [1], index: 0, position: "before" },
            ],
            [
                "text after its previous row",
                { kind: "text", path: [1], index: 1 },
                { kind: "text", path: [1], index: 0, position: "after" },
            ],
            [
                "a section after its previous sibling",
                { kind: "section", path: [2] },
                { kind: "section", path: [1], position: "after" },
            ],
        ])("records nothing for a drop of %s", (_name, item, target) => {
            const before = state().resume;
            state().setDragItem(item);
            state().setDropTarget(target);
            state().drop();
            expect(state().resume).toBe(before);
            expect(state().past).toHaveLength(0);
            expect(state().saveState).toBe("clean");
            expect(state().dragItem).toBeNull();
        });

        it("clears history when another resume loads", () => {
            state().setFilename("one");
            state().undo();
            state().load(makeResume(), { kind: "local", id: "r2" });
            expect(state().past).toHaveLength(0);
            expect(state().future).toHaveLength(0);
        });
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

function makeSection(): ISection {
    return {
        title: "New",
        type: "full-text",
        toggled: true,
        content: [],
        subsections: [],
    };
}
