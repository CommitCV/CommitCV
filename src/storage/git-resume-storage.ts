import type { IResume } from "@resume/resume";
import { parseResume } from "@resume/parse-resume";
import { GitAuthError, GitConflictError } from "../git/errors";
import type { GitClient } from "../git/git-client";
import { MemorySessionStore, type ISessionStore } from "../git/sessions";
import { mergeResume } from "@resume/merge-resume";
import {
    generateCommitBody,
    generateCommitMessage,
} from "@resume/commit-message";
import type { IResumeEntry, IResumeStorage } from "./resume-storage";
import { ConflictError, UnauthorizedError } from "./github-resume-storage";

/** The slice of `GitClient` the adapter needs (lets tests and e2e fake it). */
export type TGitClient = Pick<
    GitClient,
    | "cloneOrOpen"
    | "readFile"
    | "listFiles"
    | "commitFile"
    | "removeFile"
    | "push"
    | "resetToRemote"
    | "squashToDefault"
    | "deleteLocalBranch"
    | "deleteRemoteBranch"
>;

export type TConflictChoice = "mine" | "remote";

/** What the editor needs beyond `IResumeStorage`: session autosave and commit. */
export interface IGitStorage extends IResumeStorage {
    /** Autosave: commit to the session branch and push it. */
    saveSession(id: string, resume: IResume): Promise<void>;
    /** Squash the session onto the default branch (see `commit`). */
    commit(id: string, resume: IResume, opts?: ICommitOptions): Promise<void>;
    /** Drops the session and returns the default branch's version. */
    discardSession(id: string): Promise<IResume | null>;
}

export interface ICommitOptions {
    /** Replaces the generated subject. */
    message?: string;
    /** Skip the merge and overwrite the default branch's version. */
    force?: boolean;
}

export interface IGitStorageOptions {
    connectionId?: string;
    sessions?: ISessionStore;
    now?: () => number;
    newId?: () => string;
}

export interface IOpenedRepo {
    client: TGitClient;
    url: string;
}

interface ISynced extends IOpenedRepo {
    defaultBranch: string;
    head: string;
}

const slug = (path: string) =>
    path
        .replace(/\.json$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "resume";

const parse = (text: string | null): IResume | null => {
    if (text === null) return null;
    try {
        return parseResume(JSON.parse(text));
    } catch {
        return null;
    }
};

/**
 * Resumes as JSON files at the root of a git repository, via `GitClient`.
 * The `id` of a resume is its path. Every call first syncs with the remote
 * (local commits to the default branch never outlive a call).
 *
 * Editing happens on a session branch `commitcv/<slug>-<id>`: `saveSession`
 * commits and pushes to it, and `save`/`commit` squash it onto the default
 * branch as one commit and delete it. If the default branch moved in the
 * meantime the file is three-way merged; when both sides changed the same
 * part, `commit` throws `ConflictError`. Entries carry no dates: a shallow
 * clone cannot tell when a file last changed.
 */
export class GitResumeStorage implements IGitStorage {
    private readonly open: () => Promise<IOpenedRepo>;
    private readonly connectionId: string;
    private readonly sessions: ISessionStore;
    private readonly now: () => number;
    private readonly newId: () => string;
    private repo?: Promise<IOpenedRepo>;
    private branch = "";
    private queue: Promise<unknown> = Promise.resolve();
    /** Last content seen per path (null = absent), for conflict checks. */
    private readonly seen = new Map<string, string | null>();
    /**
     * A commit whose file holds what the editor's document derives from, per
     * path: the merge base of the next session. Set on load and kept up to
     * date after a commit or discard, never dropped, so a later commit does
     * not mistake another device's push for part of the editor's base.
     */
    private readonly loadedAt = new Map<string, string>();

    constructor(
        open: () => Promise<IOpenedRepo>,
        {
            connectionId = "",
            sessions = new MemorySessionStore(),
            now = Date.now,
            newId = () => crypto.randomUUID().slice(0, 8),
        }: IGitStorageOptions = {},
    ) {
        this.open = open;
        this.connectionId = connectionId;
        this.sessions = sessions;
        this.now = now;
        this.newId = newId;
    }

    async list(): Promise<IResumeEntry[]> {
        return this.guard(async () => {
            const { client } = await this.sync();
            const files = await client.listFiles(this.branch);
            return files.map((id) => ({
                id,
                filename: id.replace(/\.json$/, ""),
                date: "",
            }));
        });
    }

    async load(id: string): Promise<IResume> {
        return this.guard(async () => {
            const { client, head } = await this.sync();
            const text = await client.readFile(this.branch, id);
            this.seen.set(id, text);
            this.loadedAt.set(id, head);
            if (text === null) throw new Error(`${id} not found`);
            return parseResume(JSON.parse(text));
        });
    }

    async saveSession(id: string, resume: IResume): Promise<void> {
        const content = JSON.stringify(resume, null, 4);
        await this.guard(async () => {
            const { client, head, defaultBranch } = await this.sync();
            let session = await this.sessions.get(this.connectionId, id);
            const onDefault = await client.readFile(defaultBranch, id);
            if (!session && content === onDefault) return;
            const branch =
                session?.branch ?? `commitcv/${slug(id)}-${this.newId()}`;
            const current = session
                ? await client.readFile(branch, id)
                : onDefault;
            session ??= {
                connectionId: this.connectionId,
                path: id,
                branch,
                baseSha: this.loadedAt.get(id) ?? head,
                headSha: null,
                lastPushedSha: null,
                startedAt: this.now(),
            };
            if (current !== content) {
                session.headSha = await this.commitToSession(
                    client,
                    session,
                    parse(current),
                    resume,
                );
                await this.sessions.put(session);
            }
            if (session.headSha && session.headSha !== session.lastPushedSha) {
                // The branch is ours alone, so overwriting a stale copy is fine.
                await client.push({ branch, force: true });
                session.lastPushedSha = session.headSha;
                await this.sessions.put(session);
            }
        });
    }

    /** `commit` with the old `save` signature; the message is optional. */
    save(id: string, resume: IResume, message?: string): Promise<void> {
        return this.commit(id, resume, { message });
    }

    /**
     * Squash: exactly one commit on the default branch with the resume's
     * content (merged with newer default-branch changes when needed), then
     * the session branch is deleted locally and remotely.
     */
    async commit(
        id: string,
        resume: IResume,
        { message, force = false }: ICommitOptions = {},
    ): Promise<void> {
        const content = JSON.stringify(resume, null, 4);
        await this.guard(async () => {
            const { client, head, defaultBranch } = await this.sync();
            let session = await this.sessions.get(this.connectionId, id);
            const ours = await client.readFile(defaultBranch, id);
            session ??= {
                connectionId: this.connectionId,
                path: id,
                branch: `commitcv/${slug(id)}-${this.newId()}`,
                baseSha: this.loadedAt.get(id) ?? head,
                headSha: null,
                lastPushedSha: null,
                startedAt: this.now(),
            };
            const base = await client.readFile(session.baseSha, id);
            // What the editor's document derives from after this commit.
            let editorSha = content === ours ? head : session.baseSha;
            const result = this.resolveContent(base, ours, content, force);

            if (result !== null && result !== ours) {
                // Keep the session branch in step so squash reads what we commit.
                const onBranch = await client.readFile(session.branch, id);
                if (onBranch !== content) {
                    session.headSha = await this.commitToSession(
                        client,
                        session,
                        parse(onBranch ?? ours),
                        resume,
                    );
                    await this.sessions.put(session);
                }
                const next = parse(result);
                const prev = parse(ours);
                const landed = await client.squashToDefault({
                    sessionBranch: session.branch,
                    path: id,
                    message:
                        message ??
                        (next
                            ? generateCommitMessage(prev, next)
                            : `update ${id}`),
                    body: next ? generateCommitBody(prev, next) : undefined,
                    content: result === content ? undefined : result,
                });
                try {
                    await client.push({ branch: defaultBranch });
                } catch (err) {
                    await client.resetToRemote(defaultBranch);
                    throw err;
                }
                this.seen.set(id, result);
                // A merge adds changes the editor never saw, so its own
                // content (the session tip) stays the base in that case.
                editorSha =
                    result === content ? landed : (session.headSha ?? landed);
            }
            await this.endSession(client, session);
            this.loadedAt.set(id, editorSha);
        });
    }

    /** The content to land on the default branch, or null for "nothing to do". */
    private resolveContent(
        base: string | null,
        ours: string | null,
        theirs: string,
        force: boolean,
    ): string | null {
        if (theirs === ours || theirs === base) return null;
        if (force || ours === base) return theirs;
        const [b, o, t] = [parse(base), parse(ours), parse(theirs)];
        const merged = b && o && t ? mergeResume(b, o, t) : null;
        if (!merged) {
            throw new ConflictError(
                "This file changed in the repository while you edited it.",
            );
        }
        return JSON.stringify(merged, null, 4);
    }

    async discardSession(id: string): Promise<IResume | null> {
        return this.guard(async () => {
            const { client, head, defaultBranch } = await this.sync();
            const session = await this.sessions.get(this.connectionId, id);
            if (session) await this.endSession(client, session);
            const text = await client.readFile(defaultBranch, id);
            this.seen.set(id, text);
            this.loadedAt.set(id, head);
            return parse(text);
        });
    }

    async remove(id: string): Promise<void> {
        await this.guard(async () => {
            const { client } = await this.sync();
            const branch = this.branch;
            await this.checkUnchanged(client, branch, id);
            await client.removeFile({
                branch,
                path: id,
                message: `delete ${id}`,
            });
            await client.push({ branch });
            this.seen.delete(id);
        });
    }

    private commitToSession(
        client: TGitClient,
        session: { branch: string; path: string },
        prev: IResume | null,
        next: IResume,
    ): Promise<string> {
        return client.commitFile({
            branch: session.branch,
            path: session.path,
            content: JSON.stringify(next, null, 4),
            message: generateCommitMessage(prev, next),
            body: generateCommitBody(prev, next) || undefined,
        });
    }

    private async endSession(
        client: TGitClient,
        session: { branch: string; path: string; lastPushedSha: string | null },
    ): Promise<void> {
        if (session.lastPushedSha) {
            // The squash is already pushed; a leftover branch is only clutter.
            await client.deleteRemoteBranch(session.branch).catch(() => {});
        }
        await client.deleteLocalBranch(session.branch);
        await this.sessions.delete(this.connectionId, session.path);
    }

    private async checkUnchanged(
        client: TGitClient,
        branch: string,
        id: string,
    ): Promise<void> {
        if (!this.seen.has(id)) return;
        if ((await client.readFile(branch, id)) !== this.seen.get(id)) {
            throw new GitConflictError(
                "This file changed in the repository. Reload it before saving.",
            );
        }
    }

    /** Fetches (cloning on first use) and drops any unpushed local commit. */
    private async sync(): Promise<ISynced> {
        this.repo ??= this.open();
        const repo = await this.repo.catch((err: unknown) => {
            this.repo = undefined;
            throw err;
        });
        const { defaultBranch, headSha } = await repo.client.cloneOrOpen(
            repo.url,
        );
        this.branch = defaultBranch;
        const head =
            (await repo.client.resetToRemote(defaultBranch)) ?? headSha;
        return { ...repo, defaultBranch, head };
    }

    /** Calls run one at a time: autosave and commit must not interleave. */
    private guard<T>(fn: () => Promise<T>): Promise<T> {
        const run = this.queue.then(async () => {
            try {
                return await fn();
            } catch (err) {
                if (err instanceof GitConflictError) {
                    throw new ConflictError(err.message);
                }
                if (err instanceof GitAuthError) {
                    throw new UnauthorizedError(err.message);
                }
                throw err;
            }
        });
        this.queue = run.catch(() => {});
        return run;
    }
}
