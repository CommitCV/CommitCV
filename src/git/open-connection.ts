import type { IOpenedRepo, TGitClient } from "../storage/git-resume-storage";
import type { IConnection } from "./connections";
import { loadGit } from "./load";
import { parseRepoUrl } from "./remote-config";

declare global {
    interface Window {
        /** Dev/test seam: replaces the real git client (used by e2e). */
        __commitcvGitFactory?: (
            connection: IConnection,
        ) => Promise<TGitClient> | TGitClient;
    }
}

/** Builds a client for a connection; isomorphic-git loads on first use. */
export async function openConnection(
    connection: Omit<IConnection, "id">,
): Promise<IOpenedRepo> {
    const url = parseRepoUrl(connection.url).url;
    if (import.meta.env.DEV && window.__commitcvGitFactory) {
        const client = await window.__commitcvGitFactory(
            connection as IConnection,
        );
        return { client, url };
    }
    const client = await loadGit(
        {
            url,
            token: connection.token,
            provider: connection.provider,
        },
        connection.author,
    );
    return { client, url };
}
