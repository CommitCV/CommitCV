import { detectProvider } from "../git/remote-config.ts";
import type { GitProvider } from "../git/remote-config.ts";
import { trackEvent } from "./tracker.ts";
import type {
    IGitEventMap,
    TGitDuration,
    TGitErrorClass,
    TGitEvent,
    TGitHostKind,
    TGitProvider,
} from "./types.ts";

const PUBLIC_HOSTS = new Set([
    "github.com",
    "gitlab.com",
    "bitbucket.org",
    "codeberg.org",
    "gitea.com",
]);

/**
 * Reduces a git host to a coarse provider and whether it is a well-known
 * public host. `hint` is the provider the app already knows (for example a
 * self-hosted GitLab); the host itself is never reported.
 */
export function classifyProvider(
    host: string,
    hint?: GitProvider,
): { provider: TGitProvider; host_kind: TGitHostKind } {
    const h = host.toLowerCase().replace(/:\d+$/, "");
    const detected = h === "codeberg.org" ? "codeberg" : detectProvider(h);
    const known = hint && hint !== "generic" ? hint : detected;
    return {
        provider: known === "generic" ? "other" : known,
        host_kind: PUBLIC_HOSTS.has(h) ? "public" : "self_hosted",
    };
}

/** Buckets a failure into a closed class; the message is never read out. */
export function classifyGitError(err: unknown): TGitErrorClass {
    if (!err || typeof err !== "object") return "unknown";
    const e = err as { name?: unknown; statusCode?: unknown };
    const status = typeof e.statusCode === "number" ? e.statusCode : 0;
    if (status === 429) return "rate_limited";
    if (e.name === "GitAuthError" || e.name === "UnauthorizedError") {
        return "auth";
    }
    if (e.name === "GitConflictError" || e.name === "ConflictError") {
        return "conflict";
    }
    if (status === 401 || status === 403) return "auth";
    if (status === 404) return "not_found";
    if (status === 502 || status === 504 || status === 413) return "proxy";
    if (status >= 500) return "server";
    if (e.name === "GitNetworkError" || err instanceof TypeError) {
        return "network";
    }
    return "unknown";
}

export function durationBucket(ms: number): TGitDuration {
    if (ms < 1000) return "lt1s";
    if (ms < 5000) return "1to5s";
    if (ms < 30_000) return "5to30s";
    return "gt30s";
}

/** Typed entry point for git events; the sanitizer enforces the allowlist. */
export function trackGit<E extends TGitEvent>(
    event: E,
    props: IGitEventMap[E],
): void {
    trackEvent(event, props as Record<string, string>);
}
