import { classifyGitError } from "../analytics";
import type { TGitErrorClass } from "../analytics";
import { GitAuthError, GitNetworkError } from "./errors";
import type { IConnection } from "./connections";
import { openConnection } from "./open-connection";
import { parseRepoUrl } from "./remote-config";

/** A user-facing message for a failed connection; never contains the token. */
export function describeConnectError(err: unknown, token: string): string {
    const name = (err as { name?: string })?.name;
    if (err instanceof GitAuthError || name === "GitAuthError") {
        return "Authentication failed. Check the access token and that it can read this repository.";
    }
    const raw = err instanceof Error ? err.message : String(err);
    const message = token ? raw.split(token).join("***") : raw;
    if (err instanceof GitNetworkError || name === "GitNetworkError") {
        return `Could not reach the git host. ${message}`;
    }
    return message || "Could not connect to the repository.";
}

/** Shallow-clones the repo to prove the URL and token work. */
export async function testConnection(
    draft: Omit<IConnection, "id">,
): Promise<
    { ok: true } | { ok: false; error: string; errorClass: TGitErrorClass }
> {
    try {
        parseRepoUrl(draft.url);
        const { client, url } = await openConnection(draft);
        await client.cloneOrOpen(url);
        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: describeConnectError(err, draft.token),
            errorClass: classifyGitError(err),
        };
    }
}
