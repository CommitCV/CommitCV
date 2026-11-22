import { trackEvent } from "./tracker.ts";
import type {
    IGitEventMap,
    TGitDuration,
    TGitErrorClass,
    TGitEvent,
    TGitProvider,
} from "./types.ts";

const INTEGRATED_HOSTS: Record<string, TGitProvider> = {
    "github.com": "github",
    "gitlab.com": "gitlab",
    "codeberg.org": "codeberg",
};

/**
 * Reduces a git host to a provider: the three integrated hosts by name,
 * everything else (self-hosted included) as "additional". The host itself is
 * never reported.
 */
export function classifyProvider(host: string): { provider: TGitProvider } {
    const h = host.toLowerCase().replace(/:\d+$/, "");
    return { provider: INTEGRATED_HOSTS[h] ?? "additional" };
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
