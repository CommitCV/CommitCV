import {
    classifyProvider,
    trackGit,
    type IGitEventMap,
    type TGitEvent,
    type TGitProvider,
} from "../analytics";
import { connections, type IConnection } from "./connections";
import { parseRepoUrl } from "./remote-config";

export interface IGitWhere {
    provider: TGitProvider;
}

/** Provider of a connection; never its URL or repository. */
export function whereOf(c: Pick<IConnection, "url" | "provider">): IGitWhere {
    try {
        return classifyProvider(parseRepoUrl(c.url).host);
    } catch {
        return classifyProvider("");
    }
}

/** Provider from a host name the app already knows. */
export const whereOfHost = (host: string): IGitWhere => classifyProvider(host);

type TWhereEvent = {
    [E in TGitEvent]: IGitEventMap[E] extends IGitWhere ? E : never;
}[TGitEvent];

/** Tracks an event for a saved connection; silently skips if it is gone. */
export async function trackGitFor<E extends TWhereEvent>(
    connectionId: string,
    event: E,
    props: Omit<IGitEventMap[E], keyof IGitWhere>,
): Promise<void> {
    try {
        const connection = await connections.get(connectionId);
        if (!connection) return;
        trackGit(event, {
            ...whereOf(connection),
            ...props,
        } as IGitEventMap[E]);
    } catch {
        // Analytics must never break a git flow.
    }
}
