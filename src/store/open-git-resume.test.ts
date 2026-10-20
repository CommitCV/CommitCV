import { beforeEach, describe, expect, it } from "vitest";
import type { IResume } from "@resume/resume";
import type { IOpenedSession, ISessionInfo } from "@storage/git-resume-storage";
import { ConflictError } from "@storage/github-resume-storage";
import {
    continueSession,
    discardSession,
    finishContinue,
    nextStep,
    openGitResume,
    sessionAge,
    squashSession,
} from "./open-git-resume";
import { resumeStorages, useResumeStore } from "./useResumeStore";

const doc = (filename: string): IResume => ({
    filename,
    date: "01-01-26",
    schema_version: 1,
    sections: [],
});
const info = { branch: "commitcv/cv-1", path: "cv.json" } as ISessionInfo;

class FakeGit {
    sessions: ISessionInfo[] = [];
    opened: IOpenedSession = {
        remote: doc("session"),
        local: null,
        diverged: false,
    };
    calls: string[] = [];
    commitError: Error | null = null;
    async findSessions() {
        return this.sessions;
    }
    async load() {
        return doc("default");
    }
    async inspectSession() {
        return this.opened;
    }
    async resolveSession(_id: string, _i: ISessionInfo, choice: string) {
        this.calls.push(`resolve:${choice}`);
        return choice === "mine" && this.opened.local
            ? this.opened.local
            : this.opened.remote;
    }
    async commit() {
        if (this.commitError) throw this.commitError;
        this.calls.push("commit");
    }
    async discardSession(_id: string, branch?: string) {
        this.calls.push(`discard:${branch}`);
        return doc("default");
    }
}

describe("open git resume", () => {
    let git: FakeGit;
    const name = () => useResumeStore.getState().resume?.filename;
    beforeEach(() => {
        git = new FakeGit();
        resumeStorages.git = () => git as never;
        useResumeStore.getState().load(doc("before"), null);
    });

    it("pure helpers", () => {
        const base = { remote: doc("r"), local: null, diverged: false };
        expect(nextStep(base)).toBe("load-remote");
        expect(nextStep({ ...base, local: doc("l") })).toBe("ask-local");
        expect(nextStep({ ...base, local: doc("l"), diverged: true })).toBe(
            "ask-diverged",
        );
        expect(sessionAge(5_000)).toBe("just now");
        expect(sessionAge(5 * 60_000)).toBe("5m ago");
        expect(sessionAge(3 * 3_600_000)).toBe("3h ago");
        expect(sessionAge(2 * 86_400_000)).toBe("2d ago");
    });

    it("opens the default version when there is no session", async () => {
        expect(await openGitResume("c1", "cv.json")).toEqual({
            kind: "opened",
        });
        expect(name()).toBe("default");
        expect(useResumeStore.getState().source).toEqual({
            kind: "git",
            connectionId: "c1",
            path: "cv.json",
        });
    });

    it("asks first, without loading, when a session exists", async () => {
        git.sessions = [info];
        expect(await openGitResume("c1", "cv.json")).toEqual({
            kind: "sessions",
            sessions: [info],
        });
        expect(name()).toBe("before");
    });

    it("continue loads the session as pushed", async () => {
        expect(await continueSession("c1", "cv.json", info)).toEqual({
            kind: "opened",
        });
        expect(name()).toBe("session");
        expect(git.calls).toEqual(["resolve:remote"]);
    });

    it("continue asks about unsaved local edits and diverged sessions", async () => {
        git.opened = { ...git.opened, local: doc("mine") };
        const local = await continueSession("c1", "cv.json", info);
        expect(local.kind).toBe("ask-local");
        expect(name()).toBe("before");
        await finishContinue("c1", "cv.json", info, "mine");
        expect(name()).toBe("mine");
        git.opened = { ...git.opened, diverged: true };
        expect((await continueSession("c1", "cv.json", info)).kind).toBe(
            "ask-diverged",
        );
    });

    it("squash commits the session content and opens the result", async () => {
        expect(await squashSession("c1", "cv.json", info)).toBe("squashed");
        expect(git.calls).toEqual(["resolve:remote", "commit"]);
        expect(name()).toBe("default");
    });

    it("squash includes unsaved local edits unless diverged", async () => {
        git.opened = { ...git.opened, local: doc("mine") };
        await squashSession("c1", "cv.json", info);
        expect(git.calls[0]).toBe("resolve:mine");
        git.calls = [];
        git.opened = { ...git.opened, diverged: true };
        await squashSession("c1", "cv.json", info);
        expect(git.calls[0]).toBe("resolve:remote");
    });

    it("a squash conflict opens the session with the conflict prompt", async () => {
        git.commitError = new ConflictError();
        expect(await squashSession("c1", "cv.json", info)).toBe("conflict");
        const state = useResumeStore.getState();
        expect(state.resume?.filename).toBe("session");
        expect(state.sync.phase).toBe("conflict");
        expect(state.saveState).toBe("dirty");
    });

    it("discard deletes the branch and opens the default version", async () => {
        await discardSession("c1", "cv.json", info);
        expect(git.calls).toEqual(["discard:commitcv/cv-1"]);
        expect(name()).toBe("default");
    });
});
