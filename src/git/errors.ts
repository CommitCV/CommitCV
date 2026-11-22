export class GitError extends Error {
    /** HTTP status of the failed request, when there was one. */
    statusCode?: number;
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

/** A save found the remote file changed since it was read. */
export class ConflictError extends Error {
    constructor(
        message = "This file changed on the remote. Reload it before saving.",
    ) {
        super(message);
        this.name = "ConflictError";
    }
}

/** The git host rejected the stored credentials. */
export class UnauthorizedError extends Error {
    constructor(message = "Sign-in expired. Sign in again.") {
        super(message);
        this.name = "UnauthorizedError";
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
    const withStatus = <T extends GitError>(error: T): T => {
        if (typeof status === "number") error.statusCode = status;
        return error;
    };
    if (e?.code === "HttpError" && (status === 401 || status === 403)) {
        return withStatus(new GitAuthError());
    }
    if (e?.code === "PushRejectedError") return new GitConflictError();
    if (
        e?.code === "HttpError" ||
        err instanceof TypeError ||
        /ENOTFOUND|ECONNREFUSED|ECONNRESET|Failed to fetch|NetworkError/i.test(
            message,
        )
    ) {
        return withStatus(
            new GitNetworkError(scrub(`Network error: ${message}`)),
        );
    }
    return withStatus(new GitError(message));
}
