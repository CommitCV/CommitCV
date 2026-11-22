import type { IResume } from "@resume/resume";
import { parseResume } from "@resume/parse-resume";
import { GitAuthError, GitConflictError } from "../git/errors";
import type { GitClient } from "../git/git-client";
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
>;

export interface IOpenedRepo {
    client: TGitClient;
    url: string;
}

/**
 * Resumes as JSON files at the root of a git repository, via `GitClient`.
 * The `id` of a resume is its path. Every call first syncs with the remote
 * (local commits never outlive a call), and a save fails with
 * `ConflictError` when the file changed remotely since this instance last
 * read or wrote it. Entries carry no dates: a shallow clone cannot tell
 * when a file last changed.
 */
export class GitResumeStorage implements IResumeStorage {
    private readonly open: () => Promise<IOpenedRepo>;
    private repo?: Promise<IOpenedRepo>;
    private branch = "";
    /** Last content seen per path (null = absent), for conflict checks. */
    private readonly seen = new Map<string, string | null>();

    constructor(open: () => Promise<IOpenedRepo>) {
        this.open = open;
    }

    /** The branch commits go to; a later PR swaps this for a session branch. */
    protected targetBranch(): string {
        return this.branch;
    }

    async list(): Promise<IResumeEntry[]> {
        return this.guard(async () => {
            const { client } = await this.sync();
            const files = await client.listFiles(this.targetBranch());
            return files.map((id) => ({
                id,
                filename: id.replace(/\.json$/, ""),
                date: "",
            }));
        });
    }

    async load(id: string): Promise<IResume> {
        return this.guard(async () => {
            const { client } = await this.sync();
            const text = await client.readFile(this.targetBranch(), id);
            this.seen.set(id, text);
            if (text === null) throw new Error(`${id} not found`);
            return parseResume(JSON.parse(text));
        });
    }

    async save(
        id: string,
        resume: IResume,
        message = `update ${id}`,
    ): Promise<void> {
        const content = JSON.stringify(resume, null, 4);
        await this.guard(async () => {
            const { client } = await this.sync();
            const branch = this.targetBranch();
            await this.checkUnchanged(client, branch, id);
            await client.commitFile({ branch, path: id, content, message });
            await client.push({ branch });
            this.seen.set(id, content);
        });
    }

    async remove(id: string): Promise<void> {
        await this.guard(async () => {
            const { client } = await this.sync();
            const branch = this.targetBranch();
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
    private async sync(): Promise<IOpenedRepo> {
        this.repo ??= this.open();
        const repo = await this.repo.catch((err: unknown) => {
            this.repo = undefined;
            throw err;
        });
        const { defaultBranch } = await repo.client.cloneOrOpen(repo.url);
        this.branch = defaultBranch;
        await repo.client.resetToRemote(defaultBranch);
        return repo;
    }

    private async guard<T>(fn: () => Promise<T>): Promise<T> {
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
    }
}
