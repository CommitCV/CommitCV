import type { IResume } from "@resume/resume";
import { parseResume } from "@resume/parse-resume";
import { GitAuthError, GitConflictError } from "../git/errors";
import type { GitClient } from "../git/git-client";
import {
    MemorySessionStore,
    type ISession,
    type ISessionStore,
} from "../git/sessions";
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
    | "listRemoteBranches"
    | "sessionCommits"
>;

export type TConflictChoice = "mine" | "remote";

/** What the editor needs beyond `IResumeStorage`: session autosave and commit. */
export interface IGitStorage extends IResumeStorage {
    /**
     * Autosave: commit to the session branch and push it. Throws
     * `SessionDivergedError` if the remote branch moved; only `force`
     * (the user's "keep mine") overwrites it.
     */
    saveSession(
        id: string,
        resume: IResume,
        opts?: { force?: boolean },
    ): Promise<void>;
    /** Squash the session onto the default branch (see `commit`). */
    commit(id: string, resume: IResume, opts?: ICommitOptions): Promise<void>;
    /**
     * Drops the session (and `branch`, a session found on the remote) and
     * returns the default branch's version.
     */
    discardSession(id: string, branch?: string): Promise<IResume | null>;
    /** Unsquashed session branches of one file, most recent activity first. */
    findSessions(id: string): Promise<ISessionInfo[]>;
    /** Unsquashed sessions of every file in the repository. */
    listSessions(): Promise<ISessionInfo[]>;
    /** What continuing `info` would load, and whether choices are needed. */
    inspectSession(id: string, info: ISessionInfo): Promise<IOpenedSession>;
    /** Makes `info` the active session and returns the chosen version. */
    resolveSession(
        id: string,
        info: ISessionInfo,
        choice: TSessionChoice,
    ): Promise<IResume>;
}

/** An unsquashed session branch that is ahead of the default branch. */
export interface ISessionInfo {
    path: string;
    branch: string;
    headSha: string;
    /** Default commit the session started from; null when out of history. */
    baseSha: string | null;
    lastCommit: { message: string; date: number };
    aheadBy: number;
    /** This browser's record of the session, if it has one. */
    local?: ISession;
}

export interface IOpenedSession {
    /** The session as last pushed. */
    remote: IResume;
    /** Newer local edits that were never pushed, if any. */
    local: IResume | null;
    /** The remote branch moved since this browser last pushed it. */
    diverged: boolean;
}

export type TSessionChoice = "remote" | "mine";

/** The remote session branch has commits this browser does not have. */
export class SessionDivergedError extends Error {
    constructor() {
        super("This session was updated elsewhere.");
        this.name = "SessionDivergedError";
    }
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
     * Mirrored to the session store, which outlives a reload: a restored
     * draft never calls `load`, so without it the base would fall back to
     * the current head and a newer remote change would be reverted silently.
     */
    private readonly loadedAt = new Map<string, string>();

    private async setBase(id: string, sha: string): Promise<void> {
        this.loadedAt.set(id, sha);
        await this.sessions.setBase(this.connectionId, id, sha);
    }

    /** The editor's base, or null when unknown (never loaded on this device). */
    private async baseOf(id: string): Promise<string | null> {
        return (
            this.loadedAt.get(id) ??
            (await this.sessions.getBase(this.connectionId, id)) ??
            null
        );
    }

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
            await this.setBase(id, head);
            if (text === null) throw new Error(`${id} not found`);
            return parseResume(JSON.parse(text));
        });
    }

    async saveSession(
        id: string,
        resume: IResume,
        { force = false }: { force?: boolean } = {},
    ): Promise<void> {
        await this.guard(() => this.saveNow(id, resume, force));
    }

    /** Commits to the session branch and fast-forwards the remote one. */
    private async saveNow(
        id: string,
        resume: IResume,
        force: boolean,
    ): Promise<void> {
        const content = JSON.stringify(resume, null, 4);
        const { client, head, defaultBranch } = await this.sync();
        let session = await this.sessions.get(this.connectionId, id);
        const onDefault = await client.readFile(defaultBranch, id);
        if (!session && content === onDefault) return;
        const known = session?.baseSha ?? (await this.baseOf(id));
        // Without a known base the file is not ours to overwrite: skip
        // autosave and let Commit raise the conflict prompt instead.
        if (!known && onDefault !== null) return;
        const branch =
            session?.branch ?? `commitcv/${slug(id)}-${this.newId()}`;
        const current = session ? await client.readFile(branch, id) : onDefault;
        session ??= {
            connectionId: this.connectionId,
            path: id,
            branch,
            baseSha: known ?? head,
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
            session.lastContent = content;
            await this.sessions.put(session);
        }
        if (
            session.headSha &&
            (force || session.headSha !== session.lastPushedSha)
        ) {
            try {
                // Only an explicit "keep mine" may overwrite the remote branch.
                await client.push({ branch, force });
            } catch (err) {
                if (err instanceof GitConflictError) {
                    throw new SessionDivergedError();
                }
                throw err;
            }
            session.lastPushedSha = session.headSha;
            delete session.lastContent;
            await this.sessions.put(session);
        }
    }

    async findSessions(id: string): Promise<ISessionInfo[]> {
        return this.guard(async () => {
            const { client, defaultBranch } = await this.sync();
            return this.inspectAll(client, defaultBranch, [id]);
        });
    }

    async listSessions(): Promise<ISessionInfo[]> {
        return this.guard(async () => {
            const { client, defaultBranch } = await this.sync();
            const files = await client.listFiles(defaultBranch);
            return this.inspectAll(client, defaultBranch, files);
        });
    }

    private async inspectAll(
        client: TGitClient,
        defaultBranch: string,
        paths: string[],
    ): Promise<ISessionInfo[]> {
        const names = await client.listRemoteBranches("commitcv/");
        const records = await this.sessions.list(this.connectionId);
        const found: ISessionInfo[] = [];
        for (const path of paths) {
            const prefix = `commitcv/${slug(path)}-`;
            // Ids have no dash, which keeps `a.json` apart from `a-1.json`.
            const branches = names.filter(
                (b) =>
                    b.startsWith(prefix) &&
                    !b.slice(prefix.length).includes("-"),
            );
            const record = records.find((r) => r.path === path);
            const onRemote = record && branches.includes(record.branch);
            if (record && !onRemote) {
                if (record.lastPushedSha) {
                    // Squashed or discarded elsewhere: the record is stale.
                    await this.endSession(client, record);
                    continue;
                }
                // Never pushed (offline): the work only exists locally.
                const info = await this.inspect(
                    client,
                    defaultBranch,
                    path,
                    record.branch,
                    record,
                    false,
                );
                if (info) found.push(info);
            }
            for (const branch of branches) {
                const own = record?.branch === branch ? record : undefined;
                const info = await this.inspect(
                    client,
                    defaultBranch,
                    path,
                    branch,
                    own,
                    true,
                );
                if (info) found.push(info);
            }
        }
        return found.sort((a, b) => b.lastCommit.date - a.lastCommit.date);
    }

    private async inspect(
        client: TGitClient,
        defaultBranch: string,
        path: string,
        branch: string,
        local: ISession | undefined,
        remote: boolean,
    ): Promise<ISessionInfo | null> {
        const found = await client
            .sessionCommits(branch, { remote })
            .catch((err: unknown) => {
                if (remote) throw err;
                return null;
            });
        if (!found?.commits.length) return null;
        const [latest] = found.commits;
        const [content, before] = await Promise.all([
            client.readFile(found.headSha, path),
            client.readFile(found.baseSha ?? defaultBranch, path),
        ]);
        // A branch that leaves this file as it was belongs to something else.
        if (content === null || content === before) return null;
        return {
            path,
            branch,
            headSha: found.headSha,
            baseSha: found.baseSha,
            lastCommit: {
                message: latest.message.split("\n")[0],
                date: latest.date.getTime(),
            },
            aheadBy: found.commits.length,
            local,
        };
    }

    async inspectSession(
        id: string,
        info: ISessionInfo,
    ): Promise<IOpenedSession> {
        return this.guard(async () => {
            const { client } = await this.sync();
            const text = await client.readFile(info.headSha, id);
            const remote = parse(text);
            if (!remote) throw new Error(`${id} is unreadable on the session.`);
            const record = await this.sessions.get(this.connectionId, id);
            const own = record?.branch === info.branch ? record : undefined;
            return {
                remote,
                local:
                    own?.lastContent !== undefined && own.lastContent !== text
                        ? parse(own.lastContent)
                        : null,
                diverged: this.diverged(own, info),
            };
        });
    }

    private diverged(own: ISession | undefined, info: ISessionInfo): boolean {
        return (
            !!own?.lastPushedSha &&
            own.lastPushedSha !== info.headSha &&
            own.headSha !== info.headSha
        );
    }

    async resolveSession(
        id: string,
        info: ISessionInfo,
        choice: TSessionChoice,
    ): Promise<IResume> {
        return this.guard(async () => {
            const { client, head } = await this.sync();
            const record = await this.sessions.get(this.connectionId, id);
            const own = record?.branch === info.branch ? record : undefined;
            if (choice === "mine") {
                if (!own) throw new Error("There are no local edits to keep.");
                const text =
                    own.lastContent ?? (await client.readFile(own.branch, id));
                const mine = parse(text);
                if (!mine) throw new Error(`${id} is unreadable.`);
                await this.saveNow(id, mine, this.diverged(own, info));
                return mine;
            }
            const remote = parse(await client.readFile(info.headSha, id));
            if (!remote) throw new Error(`${id} is unreadable on the session.`);
            if (own && !own.lastPushedSha && own.headSha === info.headSha) {
                // Local-only session: pushing it is what makes it resumable.
                await client.push({ branch: own.branch });
                own.lastPushedSha = own.headSha;
                delete own.lastContent;
                await this.sessions.put(own);
                return remote;
            }
            await client.resetToRemote(info.branch);
            await this.sessions.put({
                connectionId: this.connectionId,
                path: id,
                branch: info.branch,
                baseSha: info.baseSha ?? own?.baseSha ?? head,
                headSha: info.headSha,
                lastPushedSha: info.headSha,
                startedAt: own?.startedAt ?? this.now(),
            });
            return remote;
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
            let baseSha = session?.baseSha ?? (await this.baseOf(id));
            if (!baseSha) {
                // Never loaded on this device: only a new file is safe.
                if (ours !== null && ours !== content && !force) {
                    throw new ConflictError(
                        "This file changed in the repository while you edited it.",
                    );
                }
                baseSha = head;
            }
            session ??= {
                connectionId: this.connectionId,
                path: id,
                branch: `commitcv/${slug(id)}-${this.newId()}`,
                baseSha,
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
            await this.setBase(id, editorSha);
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

    async discardSession(id: string, branch?: string): Promise<IResume | null> {
        return this.guard(async () => {
            const { client, head, defaultBranch } = await this.sync();
            const session = await this.sessions.get(this.connectionId, id);
            if (session) await this.endSession(client, session);
            if (branch && branch !== session?.branch) {
                await client.deleteRemoteBranch(branch).catch(() => {});
                await client.deleteLocalBranch(branch);
            }
            const text = await client.readFile(defaultBranch, id);
            this.seen.set(id, text);
            await this.setBase(id, head);
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
