import { connections, type IConnection } from "./connections";
import type { GitProvider } from "./remote-config";

export interface ProviderOption {
    provider: GitProvider;
    hosts: string[];
}

export interface Handoff {
    provider: GitProvider;
    host: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    user: { name: string; email?: string; login: string };
}

export interface RepoSummary {
    fullName: string;
    cloneUrl: string;
    defaultBranch: string;
    private: boolean;
}

export const PROVIDER_NAMES: Record<string, string> = {
    github: "GitHub",
    gitlab: "GitLab",
    bitbucket: "Bitbucket",
    gitea: "Gitea",
    forgejo: "Forgejo",
};

const SIGNIN_ERRORS: Record<string, string> = {
    denied: "Sign-in was cancelled or denied.",
    exchange_failed: "The provider rejected the sign-in. Try again.",
    not_configured: "That provider is no longer available.",
    busy: "The server is busy. Try again in a minute.",
};

/** A readable message for a `signin_error` code from the callback. */
export function signinErrorMessage(code: string): string {
    return SIGNIN_ERRORS[code] ?? "Sign-in failed. Try again.";
}

export function loginUrl(provider: string, host: string): string {
    const params = new URLSearchParams({ provider, host, return: "/connect" });
    return `/api/oauth/login?${params}`;
}

/** The connection for a repo picked after sign-in; the token stays in IndexedDB. */
export function connectionFromHandoff(
    handoff: Handoff,
    repo: { url: string; path: string },
    author: { name: string; email: string },
): Omit<IConnection, "id"> {
    const { refreshToken, expiresAt } = handoff;
    return {
        url: repo.url,
        provider: handoff.provider,
        label: `${handoff.user.login || author.name}@${handoff.host}`,
        token: handoff.accessToken,
        author,
        ...(refreshToken || expiresAt
            ? { oauth: { host: handoff.host, refreshToken, expiresAt } }
            : {}),
    };
}

async function json<T>(response: Response, fallback: string): Promise<T> {
    const data = (await response.json().catch(() => ({}))) as T & {
        error?: string;
    };
    if (!response.ok) throw new Error(data.error || fallback);
    return data;
}

export async function fetchProviders(): Promise<ProviderOption[]> {
    try {
        const data = await json<{ providers: ProviderOption[] }>(
            await fetch("/api/oauth/providers"),
            "",
        );
        return Array.isArray(data.providers) ? data.providers : [];
    } catch {
        return [];
    }
}

let handoff: Promise<Handoff> | undefined;

/** One POST per page load, so a StrictMode double effect cannot burn it. */
export function takeHandoff(): Promise<Handoff> {
    handoff ??= fetch("/api/oauth/handoff", { method: "POST" }).then(
        async (response) => {
            if (response.status === 410) {
                throw new Error("That sign-in expired. Sign in again.");
            }
            return json<Handoff>(response, "Sign-in could not be completed.");
        },
    );
    return handoff;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function listRepos(
    handoff: Pick<Handoff, "provider" | "host" | "accessToken">,
    q: string,
): Promise<RepoSummary[]> {
    const params = new URLSearchParams({
        provider: handoff.provider,
        host: handoff.host,
        q,
    });
    const data = await json<{ repos: RepoSummary[] }>(
        await fetch(`/api/oauth/repos?${params}`, {
            headers: bearer(handoff.accessToken),
        }),
        "Could not list repositories.",
    );
    return data.repos;
}

export async function generateFromTemplate(
    token: string,
    template: string,
    name: string,
): Promise<RepoSummary> {
    return json<RepoSummary>(
        await fetch("/api/oauth/github/generate-from-template", {
            method: "POST",
            headers: { ...bearer(token), "Content-Type": "application/json" },
            body: JSON.stringify({ template, name }),
        }),
        "Could not create the repository.",
    );
}

const SKEW_MS = 60_000;

/**
 * Swaps in a fresh access token when an OAuth connection's token has expired
 * (or is about to). Failure keeps the old token: the git call then fails with
 * an ordinary auth error and the user reconnects.
 */
export async function freshConnection(
    connection: IConnection,
    now = Date.now(),
): Promise<IConnection> {
    const { oauth } = connection;
    if (!oauth?.refreshToken || !oauth.expiresAt) return connection;
    if (oauth.expiresAt - SKEW_MS > now) return connection;
    try {
        const next = await json<{
            accessToken: string;
            refreshToken?: string;
            expiresAt?: number;
        }>(
            await fetch("/api/oauth/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: connection.provider,
                    host: oauth.host,
                    refreshToken: oauth.refreshToken,
                }),
            }),
            "refresh failed",
        );
        const updated: IConnection = {
            ...connection,
            token: next.accessToken,
            oauth: {
                host: oauth.host,
                refreshToken: next.refreshToken ?? oauth.refreshToken,
                expiresAt: next.expiresAt,
            },
        };
        await connections.update(updated);
        return updated;
    } catch {
        return connection;
    }
}
