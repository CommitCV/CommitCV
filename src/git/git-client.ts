import git from "isomorphic-git";
import type { FsClient, HttpClient } from "isomorphic-git";
import { COMMITTER, type GitIdentity } from "./identity";
import { mapGitError } from "./errors";
import type { GitCredentials } from "./remote-config";

export interface GitClientDeps {
    fs: FsClient;
    http: HttpClient;
    /** isomorphic-git `corsProxy`, e.g. `${origin}/api/git-proxy`. */
    corsProxy?: string;
    auth: GitCredentials;
    author: GitIdentity;
    now?: () => number;
}

export interface LogEntry {
    sha: string;
    message: string;
    author: GitIdentity;
    committer: GitIdentity;
    date: Date;
}

const REMOTE = "origin";
const isSha = (s: string) => /^[0-9a-f]{40}$/.test(s);

/** Stable short directory name for a repo URL. */
export function dirFor(url: string): string {
    let h = 5381;
    for (const c of url) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return `/repos/${h.toString(16)}`;
}

/**
 * Thin wrapper over isomorphic-git for one remote repo. Clones are shallow
 * and have no working tree (`noCheckout`); reads and commits go straight to
 * the object database, so nothing depends on a checked-out state.
 */
export class GitClient {
    private readonly d: GitClientDeps;
    private url = "";
    private dir = "";

    constructor(deps: GitClientDeps) {
        this.d = deps;
    }

    private get base() {
        return { fs: this.d.fs, dir: this.dir };
    }

    private get net() {
        const { auth } = this.d;
        return {
            http: this.d.http,
            corsProxy: this.d.corsProxy,
            onAuth: () => auth,
        };
    }

    private get secrets() {
        return [this.d.auth.username, this.d.auth.password];
    }

    private async run<T>(fn: () => Promise<T>): Promise<T> {
        try {
            return await fn();
        } catch (err) {
            throw mapGitError(err, this.secrets);
        }
    }

    async cloneOrOpen(
        url: string,
        { depth = 1 }: { depth?: number } = {},
    ): Promise<{ defaultBranch: string; headSha: string }> {
        this.url = url;
        this.dir = dirFor(url);
        const exists = await git
            .listRemotes(this.base)
            .then((r) => r.length > 0)
            .catch(() => false);
        await this.run(async () => {
            if (exists) {
                await git.fetch({
                    ...this.base,
                    ...this.net,
                    url,
                    remote: REMOTE,
                    singleBranch: true,
                    tags: false,
                    depth,
                });
            } else {
                await git.clone({
                    ...this.base,
                    ...this.net,
                    url,
                    remote: REMOTE,
                    singleBranch: true,
                    noCheckout: true,
                    noTags: true,
                    depth,
                });
            }
        });
        const defaultBranch = await this.defaultBranch();
        return { defaultBranch, headSha: await this.resolve(defaultBranch) };
    }

    private async defaultBranch(): Promise<string> {
        const branch = await git.currentBranch({ ...this.base });
        if (!branch) throw new Error("Repository has no default branch");
        return branch;
    }

    /** Local branch wins (unpushed work), then remote-tracking, then a sha. */
    private async resolve(ref: string): Promise<string> {
        for (const full of [
            `refs/heads/${ref}`,
            `refs/remotes/${REMOTE}/${ref}`,
        ]) {
            try {
                return await git.resolveRef({ ...this.base, ref: full });
            } catch {
                /* try next */
            }
        }
        if (isSha(ref)) return ref;
        throw new Error(`Unknown ref: ${ref}`);
    }

    private async tryResolve(ref: string): Promise<string | null> {
        return this.resolve(ref).catch(() => null);
    }

    async readFile(ref: string, path: string): Promise<string | null> {
        const oid = await this.tryResolve(ref);
        if (!oid) return null;
        try {
            const { blob } = await git.readBlob({
                ...this.base,
                oid,
                filepath: path,
            });
            return new TextDecoder().decode(blob);
        } catch (err) {
            const code = (err as { code?: string }).code;
            if (code === "NotFoundError" || code === "ObjectTypeError") {
                return null;
            }
            throw err;
        }
    }

    /** `.json` files directly inside `dirPath` (no recursion). */
    async listFiles(ref: string, dirPath = ""): Promise<string[]> {
        const oid = await this.tryResolve(ref);
        if (!oid) return [];
        const prefix = dirPath ? dirPath.replace(/\/+$/, "") + "/" : "";
        const all = await git.listFiles({ ...this.base, ref: oid });
        return all
            .filter(
                (p) =>
                    p.startsWith(prefix) &&
                    !p.slice(prefix.length).includes("/") &&
                    p.endsWith(".json"),
            )
            .sort();
    }

    /**
     * Plumbing only: writeBlob, rebuild the trees along `path`, then
     * `commit({ tree })` so no index or working tree is needed (a shallow,
     * no-checkout clone has neither). A missing branch starts from the
     * remote default branch head.
     */
    async commitFile(opts: {
        branch: string;
        path: string;
        content: string;
        message: string;
        body?: string;
    }): Promise<string> {
        const blob = await git.writeBlob({
            ...this.base,
            blob: new TextEncoder().encode(opts.content),
        });
        return this.commitChange({ ...opts, blob });
    }

    /** Commits the deletion of `path`; a no-op change if it does not exist. */
    async removeFile(opts: {
        branch: string;
        path: string;
        message: string;
        body?: string;
    }): Promise<string> {
        return this.commitChange({ ...opts, blob: null });
    }

    /** Points the local branch at the fetched remote one, dropping local commits. */
    async resetToRemote(branch: string): Promise<string> {
        const value = await git.resolveRef({
            ...this.base,
            ref: `refs/remotes/${REMOTE}/${branch}`,
        });
        await git.writeRef({
            ...this.base,
            ref: `refs/heads/${branch}`,
            value,
            force: true,
        });
        return value;
    }

    /**
     * One commit on the default branch that sets `path` to the session
     * branch's version (or `content`, e.g. a merge result) on top of the
     * current default head. No rebase: the session's own commits are not
     * replayed, so history gets a single commit per manual save. Local only;
     * the caller pushes.
     */
    async squashToDefault(opts: {
        sessionBranch: string;
        path: string;
        message: string;
        body?: string;
        content?: string;
    }): Promise<string> {
        const { sessionBranch, path, message, body, content } = opts;
        let blob: string;
        if (content !== undefined) {
            blob = await git.writeBlob({
                ...this.base,
                blob: new TextEncoder().encode(content),
            });
        } else {
            const head = await this.resolve(sessionBranch);
            ({ oid: blob } = await git.readBlob({
                ...this.base,
                oid: head,
                filepath: path,
            }));
        }
        return this.commitChange({
            branch: await this.defaultBranch(),
            path,
            blob,
            message,
            body,
        });
    }

    /** Drops a local branch (not the remote one); fine if it is already gone. */
    async deleteLocalBranch(branch: string): Promise<void> {
        await git.deleteBranch({ ...this.base, ref: branch }).catch(() => {});
    }

    private async commitChange(opts: {
        branch: string;
        path: string;
        blob: string | null;
        message: string;
        body?: string;
    }): Promise<string> {
        const { branch, path, blob, message, body } = opts;
        const parent =
            (await this.tryResolve(branch)) ??
            (await this.resolve(await this.defaultBranch()));
        const { commit } = await git.readCommit({ ...this.base, oid: parent });
        const tree = await this.setPath(
            commit.tree,
            path.split("/").filter(Boolean),
            blob,
        );
        const ts = Math.floor((this.d.now ?? Date.now)() / 1000);
        return git.commit({
            ...this.base,
            ref: `refs/heads/${branch}`,
            parent: [parent],
            tree,
            message: body ? `${message}\n\n${body}` : message,
            author: { ...this.d.author, timestamp: ts, timezoneOffset: 0 },
            committer: { ...COMMITTER, timestamp: ts, timezoneOffset: 0 },
        });
    }

    /** `blob` null removes the entry (and any directory left empty). */
    private async setPath(
        treeOid: string | null,
        segs: string[],
        blob: string | null,
    ): Promise<string> {
        const entries = treeOid
            ? (await git.readTree({ ...this.base, oid: treeOid })).tree
            : [];
        const [name, ...rest] = segs;
        const old = entries.find((e) => e.path === name);
        const others = entries.filter((e) => e.path !== name);
        let next;
        if (rest.length) {
            const oid = await this.setPath(
                old?.type === "tree" ? old.oid : null,
                rest,
                blob,
            );
            const empty =
                (await git.readTree({ ...this.base, oid })).tree.length === 0;
            next = empty
                ? null
                : { mode: "040000", path: name, type: "tree" as const, oid };
        } else {
            next = blob
                ? {
                      mode: "100644",
                      path: name,
                      type: "blob" as const,
                      oid: blob,
                  }
                : null;
        }
        return git.writeTree({
            ...this.base,
            tree: next ? [...others, next] : others,
        });
    }

    async push({
        branch,
        force = false,
    }: {
        branch: string;
        force?: boolean;
    }): Promise<void> {
        const res = await this.run(() =>
            git.push({
                ...this.base,
                ...this.net,
                remote: REMOTE,
                url: this.url,
                ref: branch,
                remoteRef: `refs/heads/${branch}`,
                force,
            }),
        );
        if (!res.ok) {
            throw mapGitError(
                Object.assign(new Error(res.error ?? "Push failed"), {
                    code: /fetch first|non-fast-forward|rejected/i.test(
                        res.error ?? "",
                    )
                        ? "PushRejectedError"
                        : undefined,
                }),
                this.secrets,
            );
        }
    }

    /**
     * Fetch one branch (default branch when omitted). `depth` re-limits
     * history; use `deepen` to extend it.
     */
    async fetch({
        branch,
        depth,
    }: { branch?: string; depth?: number } = {}): Promise<void> {
        await this.run(async () =>
            git.fetch({
                ...this.base,
                ...this.net,
                url: this.url,
                remote: REMOTE,
                ref: branch ?? (await this.defaultBranch()),
                singleBranch: true,
                tags: false,
                depth,
            }),
        );
    }

    /**
     * Commits on `branch` that are not in the default branch's history,
     * newest first, and the commit it branched from (null when that is older
     * than the fetched history). `remote` reads the server's version of the
     * branch (fetching it and the default branch); otherwise the local ref.
     */
    async sessionCommits(
        branch: string,
        { remote = true, depth = 100 } = {},
    ): Promise<{
        headSha: string;
        baseSha: string | null;
        commits: LogEntry[];
    }> {
        if (remote) {
            await this.fetch({ depth });
            await this.fetch({ branch, depth });
        }
        const headSha = remote
            ? await git.resolveRef({
                  ...this.base,
                  ref: `refs/remotes/${REMOTE}/${branch}`,
              })
            : await this.resolve(branch);
        const onDefault = new Set(
            (
                await git.log({
                    ...this.base,
                    ref: await this.resolve(await this.defaultBranch()),
                    depth,
                })
            ).map((c) => c.oid),
        );
        const commits: LogEntry[] = [];
        let baseSha: string | null = null;
        for (const { oid, commit: c } of await git.log({
            ...this.base,
            ref: headSha,
            depth,
        })) {
            if (onDefault.has(oid)) {
                baseSha = oid;
                break;
            }
            commits.push({
                sha: oid,
                message: c.message.trimEnd(),
                author: { name: c.author.name, email: c.author.email },
                committer: {
                    name: c.committer.name,
                    email: c.committer.email,
                },
                date: new Date(c.author.timestamp * 1000),
            });
        }
        return { headSha, baseSha, commits };
    }

    /** Fetch `n` more commits of history for `branch`. */
    async deepen(n: number, branch?: string): Promise<void> {
        await this.run(async () =>
            git.fetch({
                ...this.base,
                ...this.net,
                url: this.url,
                remote: REMOTE,
                ref: branch ?? (await this.defaultBranch()),
                singleBranch: true,
                tags: false,
                depth: n,
                relative: true,
            }),
        );
    }

    /** Whether history is cut off (a `deepen` may reveal more commits). */
    async isShallow(): Promise<boolean> {
        const text = await this.d.fs.promises
            .readFile(`${this.dir}/.git/shallow`, "utf8")
            .catch(() => "");
        return String(text).trim() !== "";
    }

    /** Branch names on the server (live, no fetch) starting with `prefix`. */
    async listRemoteBranches(prefix = ""): Promise<string[]> {
        const head = "refs/heads/";
        const refs = await this.run(() =>
            git.listServerRefs({
                ...this.net,
                url: this.url,
                prefix: head + prefix,
            }),
        );
        return refs
            .map((r) => r.ref.slice(head.length))
            .filter((b) => b.startsWith(prefix))
            .sort();
    }

    async deleteRemoteBranch(branch: string): Promise<void> {
        const ref = `refs/heads/${branch}`;
        await this.run(async () => {
            // push --delete resolves the local ref; a fetched-only branch has none.
            await git.resolveRef({ ...this.base, ref }).catch(async () =>
                git.writeRef({
                    ...this.base,
                    ref,
                    value: await git.resolveRef({
                        ...this.base,
                        ref: `refs/remotes/${REMOTE}/${branch}`,
                    }),
                }),
            );
            return git.push({
                ...this.base,
                ...this.net,
                remote: REMOTE,
                url: this.url,
                ref,
                delete: true,
            });
        });
    }

    /**
     * Commits touching `path`, newest first. Only fetched history is
     * visible: in a shallow clone the oldest fetched commit is reported as a
     * change to every file, and older edits need `deepen`.
     */
    async log(
        ref: string,
        path: string,
        { depth }: { depth?: number } = {},
    ): Promise<LogEntry[]> {
        const oid = await this.tryResolve(ref);
        if (!oid) return [];
        const commits = await git.log({
            ...this.base,
            ref: oid,
            filepath: path,
            depth,
        });
        // git.log counts depth before the path filter, so cap here too.
        return commits.slice(0, depth).map(({ oid: sha, commit: c }) => ({
            sha,
            message: c.message.trimEnd(),
            author: { name: c.author.name, email: c.author.email },
            committer: { name: c.committer.name, email: c.committer.email },
            date: new Date(c.author.timestamp * 1000),
        }));
    }
}
