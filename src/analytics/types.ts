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
