import {
    AnalyticsEvents,
    type TAnalyticsEvent,
    type TEventPayload,
} from "./types.ts";
import { sanitizeEventData, sanitizePagePath } from "./sanitizer.ts";
import {
    classifyCompileError,
    classifyJavaScriptError,
    initErrorTracking,
} from "./errors.ts";
import { initPerformanceTracking } from "./performance.ts";

export interface IUmamiConfig {
    url?: string;
    websiteId?: string;
    domains?: string;
    isProd: boolean;
    enabled: boolean;
}

interface IQueuedEvent {
    eventName: string;
    data?: Record<string, string | number | boolean>;
}

let eventQueue: IQueuedEvent[] = [];
let initialized = false;
let checkIntervalId: number | undefined;

export function getUmamiConfig(): IUmamiConfig {
    const url =
        (import.meta.env.VITE_UMAMI_URL as string | undefined) ||
        (import.meta.env.UMAMI_URL as string | undefined);
    const websiteId =
        (import.meta.env.VITE_UMAMI_ID as string | undefined) ||
        (import.meta.env.UMAMI_ID as string | undefined) ||
        (import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined) ||
        (import.meta.env.UMAMI_WEBSITE_ID as string | undefined);
    const domains =
        (import.meta.env.VITE_UMAMI_DOMAINS as string | undefined) ||
        (import.meta.env.UMAMI_DOMAINS as string | undefined);
    const isProd = Boolean(import.meta.env.PROD);

    const enabled = Boolean(url && websiteId);

    return {
        url,
        websiteId,
        domains,
        isProd,
        enabled,
    };
}

export function normalizeScriptUrl(rawUrl: string): string {
    const trimmed = rawUrl.trim();
    if (trimmed.endsWith(".js")) {
        return trimmed;
    }
    return `${trimmed.replace(/\/+$/, "")}/script.js`;
}

/**
 * Initializes Umami analytics tracking according to CommitCV legal policy:
 * - Injects the self-hosted Umami script
 * - Automatically drains queued events upon load
 * - Binds global error and performance monitors
 */
export function initUmami(): boolean {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return false;
    }

    if (initialized) {
        return true;
    }

    const config = getUmamiConfig();
    if (!config.enabled || !config.url || !config.websiteId) {
        return false;
    }

    // Check if script tag is already in head
    const existingScript = document.querySelector<HTMLScriptElement>(
        "script[data-website-id]",
    );
    if (!existingScript) {
        const script = document.createElement("script");
        script.defer = true;
        script.src = normalizeScriptUrl(config.url);
        script.dataset.websiteId = config.websiteId;
        // Umami's own pageviews would otherwise include the query string.
        script.dataset.excludeSearch = "true";
        script.dataset.excludeHash = "true";

        if (config.domains) {
            script.dataset.domains = config.domains;
        } else if (config.isProd) {
            script.dataset.domains = "commitcv.com";
        }
        // In local development without domains set, leave data-domains undefined so it tracks on localhost.

        script.onload = () => {
            flushEventQueue();
        };

        document.head.appendChild(script);
    }

    initialized = true;

    // Listen for errors and page load performance
    initErrorTracking((event, data) => trackEvent(event, data));
    initPerformanceTracking((event, data) => trackEvent(event, data));

    // Polling backup to drain queue if window.umami initializes asynchronously
    if (typeof window.setInterval !== "undefined") {
        let attempts = 0;
        checkIntervalId = window.setInterval(() => {
            attempts++;
            if (window.umami?.track) {
                flushEventQueue();
                window.clearInterval(checkIntervalId);
            } else if (attempts > 20) {
                window.clearInterval(checkIntervalId);
            }
        }, 200);
    }

    return true;
}

export function flushEventQueue(): void {
    if (typeof window === "undefined" || !window.umami?.track) {
        return;
    }

    while (eventQueue.length > 0) {
        const item = eventQueue.shift();
        if (item) {
            window.umami.track(item.eventName, item.data);
        }
    }
}

/**
 * Generic event tracker.
 * Dispatches to `window.umami.track` or queues the event until the tracker script loads.
 */
export function trackEvent(
    eventName: TAnalyticsEvent | string,
    data?: TEventPayload,
): void {
    if (typeof window === "undefined") {
        return;
    }

    const sanitized = sanitizeEventData(eventName, data);

    if (window.umami?.track) {
        window.umami.track(eventName, sanitized);
    } else {
        eventQueue.push({ eventName, data: sanitized });
    }
}

/**
 * Tracks a pageview.
 * Umami tracks pageviews automatically on load, but in Single-Page Apps (React Router),
 * route transitions should also trigger pageview records.
 */
export function trackPageView(url?: string): void {
    if (typeof window === "undefined") {
        return;
    }

    if (window.umami?.track) {
        if (url) {
            window.umami.track((props: Record<string, unknown>) => ({
                ...props,
                url: sanitizePagePath(url),
            }));
        } else {
            window.umami.track();
        }
    }
}

// -----------------------------------------------------------------------------
// Explicit helper functions for all events outlined in docs/legal/privacy.md
// -----------------------------------------------------------------------------

/** Section 4.1: "A resume was created" */
export function trackResumeCreated(): void {
    trackEvent(AnalyticsEvents.RESUME_CREATED);
}

/** Section 4.1: "A resume was downloaded as a PDF" */
export function trackResumeDownloadedPdf(): void {
    trackEvent(AnalyticsEvents.RESUME_DOWNLOADED_PDF);
}

/** Section 4.1: "A resume was deleted" */
export function trackResumeDeleted(): void {
    trackEvent(AnalyticsEvents.RESUME_DELETED);
}

/** Section 4.1: "A resume was imported or exported" (Import) */
export function trackResumeImported(): void {
    trackEvent(AnalyticsEvents.RESUME_IMPORTED);
}

/** Section 4.1: "A resume was imported or exported" (Export) */
export function trackResumeExported(): void {
    trackEvent(AnalyticsEvents.RESUME_EXPORTED);
}

/** Section 4.1: "Resume compile errors (the type of error only, never your resume text)" */
export function trackCompileError(error: unknown): void {
    const errorType = classifyCompileError(error);
    if (!errorType) return;
    trackEvent(AnalyticsEvents.RESUME_COMPILE_ERROR, { error_type: errorType });
}

/** Section 4.1: "Crash and JavaScript error reports" */
export function trackJavaScriptError(error: unknown): void {
    const errorType = classifyJavaScriptError(error);
    trackEvent(AnalyticsEvents.JAVASCRIPT_ERROR, { error_type: errorType });
}

/** Reset function for isolated testing environments */
export function _resetAnalyticsForTesting(): void {
    eventQueue = [];
    initialized = false;
    if (checkIntervalId && typeof window !== "undefined") {
        window.clearInterval(checkIntervalId);
    }
}
