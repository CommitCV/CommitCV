/** The shape of the global `window.umami` tracker API. */
export interface UmamiTracker {
    track: {
        (
            eventName?:
                | string
                | ((props: Record<string, unknown>) => Record<string, unknown>),
            eventData?: Record<string, string | number | boolean>,
        ): Promise<string | undefined> | void;
    };
}

declare global {
    interface Window {
        umami?: UmamiTracker;
    }
}

/**
 * Custom analytics events defined in the CommitCV Privacy Policy (docs/legal/privacy.md).
 * Usage events contain only the event name, never any resume content.
 */
export const AnalyticsEvents = {
    RESUME_CREATED: "a resume was created",
    RESUME_DOWNLOADED_PDF: "a resume was downloaded as a pdf",
    RESUME_DELETED: "a resume was deleted",
    RESUME_IMPORTED: "a resume was imported",
    RESUME_EXPORTED: "a resume was exported",
    RESUME_COMPILE_ERROR: "resume compile error",
    JAVASCRIPT_ERROR: "javascript error",
    PAGE_LOAD_PERFORMANCE: "page load performance",
} as const;

export type TAnalyticsEvent =
    (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/** Sanitized payload for compile error events. Never contains resume text. */
export interface ICompileErrorData {
    error_type: string;
}

/** Sanitized payload for runtime error / crash events. */
export interface IJavaScriptErrorData {
    error_type: string;
}

/** Sanitized payload for page load performance. */
export interface IPerformanceData {
    load_time_ms: number;
    dom_content_loaded_ms: number;
    ttfb_ms: number;
}

export type TEventPayload =
    | ICompileErrorData
    | IJavaScriptErrorData
    | IPerformanceData
    | Record<string, string | number | boolean>;

export type TGitProvider = "github" | "gitlab" | "codeberg" | "additional";
export type TGitMethod = "oauth" | "token";
export type TGitErrorClass =
    | "auth"
    | "not_found"
    | "conflict"
    | "network"
    | "rate_limited"
    | "proxy"
    | "server"
    | "unknown";
export type TGitDuration = "lt1s" | "1to5s" | "5to30s" | "gt30s";

interface IGitWhere {
    provider: TGitProvider;
}

/**
 * Git connection and sync events and the only properties each may carry.
 * Every value is a closed enum: no repo, owner, URL, host, path, file name,
 * commit message, SHA, token or error text ever appears here.
 */
export interface IGitEventMap {
    "git connect started": IGitWhere & { method: TGitMethod };
    "git sign-in returned": {
        provider?: TGitProvider;
        outcome: "ok" | "failed";
        error_class?: TGitErrorClass;
    };
    "git repo listed": IGitWhere & { outcome: "found" | "empty" | "failed" };
    "git connected": IGitWhere & { method: TGitMethod };
    "git connect failed": IGitWhere & {
        method: TGitMethod;
        error_class: TGitErrorClass;
    };
    "git template created": IGitWhere;
    "git save failed": IGitWhere & { error_class: TGitErrorClass };
    "git commit completed": IGitWhere & { duration_bucket: TGitDuration };
    "git sync prompt shown": { kind: "conflict" | "diverged" };
    "git sync prompt resolved": {
        kind: "conflict" | "diverged";
        choice: "mine" | "remote";
    };
    "git session prompt shown": { sessions: "one" | "many" };
    "git session prompt resolved": {
        choice: "continue" | "squash" | "discard" | "cancel";
    };
    "git auth expired": IGitWhere & { during: "commit" | "autosave" };
    "git token refresh": IGitWhere & { outcome: "ok" | "failed" };
    "git resume opened": IGitWhere;
    "git history opened": IGitWhere;
    "git version restored": IGitWhere;
}

export type TGitEvent = keyof IGitEventMap;

const PROVIDERS = ["github", "gitlab", "codeberg", "additional"] as const;
const METHODS = ["oauth", "token"] as const;
const ERROR_CLASSES = [
    "auth",
    "not_found",
    "conflict",
    "network",
    "rate_limited",
    "proxy",
    "server",
    "unknown",
] as const;
const DURATIONS = ["lt1s", "1to5s", "5to30s", "gt30s"] as const;
const OUTCOME_OK = ["ok", "failed"] as const;
const PROMPT_KINDS = ["conflict", "diverged"] as const;
const CHOICES = ["mine", "remote"] as const;
const WHERE = { provider: PROVIDERS } as const;

/** Runtime allowlist; the type keeps it in step with `IGitEventMap`. */
export const GIT_EVENT_SCHEMA: {
    [E in TGitEvent]: { [K in keyof IGitEventMap[E]]-?: readonly string[] };
} = {
    "git connect started": { ...WHERE, method: METHODS },
    "git sign-in returned": {
        provider: PROVIDERS,
        outcome: OUTCOME_OK,
        error_class: ERROR_CLASSES,
    },
    "git repo listed": { ...WHERE, outcome: ["found", "empty", "failed"] },
    "git connected": { ...WHERE, method: METHODS },
    "git connect failed": {
        ...WHERE,
        method: METHODS,
        error_class: ERROR_CLASSES,
    },
    "git template created": WHERE,
    "git save failed": { ...WHERE, error_class: ERROR_CLASSES },
    "git commit completed": { ...WHERE, duration_bucket: DURATIONS },
    "git sync prompt shown": { kind: PROMPT_KINDS },
    "git sync prompt resolved": { kind: PROMPT_KINDS, choice: CHOICES },
    "git session prompt shown": { sessions: ["one", "many"] },
    "git session prompt resolved": {
        choice: ["continue", "squash", "discard", "cancel"],
    },
    "git auth expired": { ...WHERE, during: ["commit", "autosave"] },
    "git token refresh": { ...WHERE, outcome: OUTCOME_OK },
    "git resume opened": WHERE,
    "git history opened": WHERE,
    "git version restored": WHERE,
};
