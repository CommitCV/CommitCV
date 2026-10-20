import type { IResume } from "@resume/resume";
import { ConflictError } from "@storage/github-resume-storage";
import type {
    IGitStorage,
    IOpenedSession,
    ISessionInfo,
} from "@storage/git-resume-storage";
import {
    resumeStorages,
    useResumeStore,
    type TResumeSource,
} from "./useResumeStore";

// Opening a git resume never starts editing while an unsquashed session
// exists: the user picks continue, squash or discard first, so a file has at
// most one active session.

export type TOpenOutcome =
    | { kind: "opened" }
    | { kind: "sessions"; sessions: ISessionInfo[] };

/** What continuing a session needs from the user before it can load. */
export type TContinueOutcome =
    | { kind: "opened" }
    | { kind: "ask-local" | "ask-diverged"; opened: IOpenedSession };

function storageOf(connectionId: string): IGitStorage {
    const storage = resumeStorages.git(connectionId);
    if (!("findSessions" in storage)) {
        throw new Error("This storage does not support sessions.");
    }
    return storage;
}

const sourceOf = (connectionId: string, path: string): TResumeSource => ({
    kind: "git",
    connectionId,
    path,
});

const show = (resume: IResume, connectionId: string, path: string) =>
    useResumeStore.getState().load(resume, sourceOf(connectionId, path));

/** Which question to ask after inspecting a session; pure for testing. */
export function nextStep(
    opened: IOpenedSession,
): "load-remote" | "ask-local" | "ask-diverged" {
    if (opened.diverged) return "ask-diverged";
    return opened.local ? "ask-local" : "load-remote";
}

/** "just now", "5m ago", "3h ago", "2d ago". */
export function sessionAge(ms: number): string {
    const minutes = Math.floor(Math.max(0, ms) / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

/** Loads the file, unless it has sessions the user must deal with first. */
export async function openGitResume(
    connectionId: string,
    path: string,
): Promise<TOpenOutcome> {
    const storage = storageOf(connectionId);
    const sessions = await storage.findSessions(path);
    if (sessions.length) return { kind: "sessions", sessions };
    show(await storage.load(path), connectionId, path);
    return { kind: "opened" };
}

export async function continueSession(
    connectionId: string,
    path: string,
    info: ISessionInfo,
): Promise<TContinueOutcome> {
    const storage = storageOf(connectionId);
    const opened = await storage.inspectSession(path, info);
    const step = nextStep(opened);
    if (step !== "load-remote") return { kind: step, opened };
    show(
        await storage.resolveSession(path, info, "remote"),
        connectionId,
        path,
    );
    return { kind: "opened" };
}

/** `mine`: this browser's version; `remote`: the session as pushed. */
export async function finishContinue(
    connectionId: string,
    path: string,
    info: ISessionInfo,
    choice: "mine" | "remote",
): Promise<void> {
    const resume = await storageOf(connectionId).resolveSession(
        path,
        info,
        choice,
    );
    show(resume, connectionId, path);
}

/**
 * Squashes the session onto the default branch and opens the result. On a
 * merge conflict the session opens instead, with the usual conflict prompt.
 */
export async function squashSession(
    connectionId: string,
    path: string,
    info: ISessionInfo,
): Promise<"squashed" | "conflict"> {
    const storage = storageOf(connectionId);
    const opened = await storage.inspectSession(path, info);
    // Unpushed local edits are the newest work; a diverged remote wins.
    const keepLocal = !opened.diverged && opened.local !== null;
    const resume = await storage.resolveSession(
        path,
        info,
        keepLocal ? "mine" : "remote",
    );
    try {
        await storage.commit(path, resume);
    } catch (err) {
        if (!(err instanceof ConflictError)) throw err;
        show(resume, connectionId, path);
        useResumeStore.setState({
            saveState: "dirty",
            sync: { phase: "conflict", autosavedAt: null },
        });
        return "conflict";
    }
    show(await storage.load(path), connectionId, path);
    return "squashed";
}

/** Deletes the session and opens the default branch's version. */
export async function discardSession(
    connectionId: string,
    path: string,
    info: ISessionInfo,
): Promise<void> {
    const resume = await storageOf(connectionId).discardSession(
        path,
        info.branch,
    );
    if (!resume) throw new Error(`${path} is not on the default branch.`);
    show(resume, connectionId, path);
}
