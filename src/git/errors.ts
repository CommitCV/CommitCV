export class GitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GitError";
    }
}
export class GitAuthError extends GitError {
    constructor(message = "Authentication failed. Check the access token.") {
        super(message);
        this.name = "GitAuthError";
    }
}
export class GitConflictError extends GitError {
    constructor(message = "Remote has changes you do not have. Fetch first.") {
        super(message);
        this.name = "GitConflictError";
    }
}
export class GitNetworkError extends GitError {
    constructor(message = "Could not reach the git host.") {
        super(message);
        this.name = "GitNetworkError";
    }
}

/** Maps isomorphic-git/fetch failures to our classes; strips the token. */
export function mapGitError(err: unknown, secrets: string[]): GitError {
    if (err instanceof GitError) return err;
    const e = err as {
        code?: string;
        message?: string;
        data?: { statusCode?: number; reason?: string };
    };
    const scrub = (s: string) =>
        secrets.filter(Boolean).reduce((a, t) => a.split(t).join("***"), s);
    const message = scrub(e?.message ?? String(err));
    const status = e?.data?.statusCode;
    if (e?.code === "HttpError" && (status === 401 || status === 403)) {
        return new GitAuthError();
    }
    if (e?.code === "PushRejectedError") return new GitConflictError();
    if (
        e?.code === "HttpError" ||
        err instanceof TypeError ||
        /ENOTFOUND|ECONNREFUSED|ECONNRESET|Failed to fetch|NetworkError/i.test(
            message,
        )
    ) {
        return new GitNetworkError(scrub(`Network error: ${message}`));
    }
    return new GitError(message);
}
