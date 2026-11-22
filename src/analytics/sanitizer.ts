import {
    AnalyticsEvents,
    GIT_EVENT_SCHEMA,
    type TAnalyticsEvent,
    type TEventPayload,
} from "./types.ts";

const USAGE_EVENTS: ReadonlySet<string> = new Set([
    AnalyticsEvents.RESUME_CREATED,
    AnalyticsEvents.RESUME_DOWNLOADED_PDF,
    AnalyticsEvents.RESUME_DELETED,
    AnalyticsEvents.RESUME_IMPORTED,
    AnalyticsEvents.RESUME_EXPORTED,
]);

const ALLOWED_PERFORMANCE_KEYS: ReadonlySet<string> = new Set([
    "load_time_ms",
    "dom_content_loaded_ms",
    "ttfb_ms",
]);

/**
 * Enforces the CommitCV privacy guarantee:
 * - Usage events contain ONLY the event name, never any payload or resume content.
 * - Compile errors contain ONLY the error type name, never resume text or diagnostics.
 * - Performance events contain only non-negative numeric timings.
 * - Any string containing '@' or exceeding length limits is stripped.
 */
export function sanitizeEventData(
    eventName: TAnalyticsEvent | string,
    data?: TEventPayload,
): Record<string, string | number | boolean> | undefined {
    if (!data || typeof data !== "object") {
        return undefined;
    }

    // Usage events must never include any event properties per Section 4.1.
    if (USAGE_EVENTS.has(eventName)) {
        return undefined;
    }

    if (eventName === AnalyticsEvents.RESUME_COMPILE_ERROR) {
        const rawType = "error_type" in data ? data.error_type : undefined;
        const errorType = sanitizeIdentifier(rawType);
        return errorType ? { error_type: errorType } : undefined;
    }

    if (eventName === AnalyticsEvents.JAVASCRIPT_ERROR) {
        const rawType = "error_type" in data ? data.error_type : undefined;
        const errorType = sanitizeIdentifier(rawType);
        return errorType ? { error_type: errorType } : undefined;
    }

    if (eventName === AnalyticsEvents.PAGE_LOAD_PERFORMANCE) {
        const cleaned: Record<string, number> = {};
        for (const [key, value] of Object.entries(data)) {
            if (
                ALLOWED_PERFORMANCE_KEYS.has(key) &&
                typeof value === "number" &&
                Number.isFinite(value) &&
                value >= 0
            ) {
                cleaned[key] = Math.round(value);
            }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }

    // Git events are fail-closed: only the event's own enum values pass, and
    // an event without a schema sends nothing. No generic fallback.
    if (eventName.startsWith("git ")) {
        const schema = (
            GIT_EVENT_SCHEMA as Record<
                string,
                Record<string, readonly string[]>
            >
        )[eventName];
        if (!schema) return undefined;
        const cleaned: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
            const allowed = Object.hasOwn(schema, key)
                ? schema[key]
                : undefined;
            if (typeof value === "string" && allowed?.includes(value)) {
                cleaned[key] = value;
            }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }

    // Generic fallback for any other events: allow only safe primitives without PII.
    const safeOutput: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(data)) {
        const cleanKey = sanitizeKey(key);
        if (!cleanKey) continue;

        if (typeof value === "number" && Number.isFinite(value)) {
            safeOutput[cleanKey] = value;
        } else if (typeof value === "boolean") {
            safeOutput[cleanKey] = value;
        } else if (typeof value === "string") {
            const cleanVal = sanitizeString(value);
            if (cleanVal) safeOutput[cleanKey] = cleanVal;
        }
    }

    return Object.keys(safeOutput).length > 0 ? safeOutput : undefined;
}

function sanitizeIdentifier(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 64) return undefined;
    // Disallow '@' or path characters to avoid accidental emails or filenames
    if (
        trimmed.includes("@") ||
        trimmed.includes("/") ||
        trimmed.includes("\\")
    )
        return undefined;
    return trimmed;
}

function sanitizeKey(key: string): string | undefined {
    const trimmed = key.trim();
    if (!trimmed || trimmed.length > 32 || trimmed.includes("@"))
        return undefined;
    return trimmed;
}

function sanitizeString(value: string): string | undefined {
    const trimmed = value.trim();
    // Do not allow email addresses, long content, or path separators
    if (
        !trimmed ||
        trimmed.length > 64 ||
        trimmed.includes("@") ||
        trimmed.includes("\n") ||
        trimmed.includes("\r")
    ) {
        return undefined;
    }
    return trimmed;
}

/**
 * Reduces a page URL to its path. Query strings and fragments can carry OAuth
 * return params (`signed_in`, `signin_error`), provider hosts or other state,
 * so they never reach analytics.
 */
export function sanitizePagePath(url: string): string {
    try {
        return new URL(url, "http://localhost").pathname;
    } catch {
        return "/";
    }
}
