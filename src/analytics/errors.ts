import { AnalyticsEvents } from "./types.ts";

/**
 * Classifies a Typst compilation error into a high-level category.
 * Returns null if the error is an intentional debounce cancellation ("replaced by a newer render").
 * Strictly never exposes resume text, code snippets, or user content.
 */
export function classifyCompileError(error: unknown): string | null {
    if (!error) return "UnknownCompileError";

    const message = error instanceof Error ? error.message : String(error);

    // Cancelled jobs from TypstClient when the user continues typing
    if (message.includes("replaced by a newer render")) {
        return null;
    }

    if (message.includes("worker crashed")) {
        return "WorkerCrash";
    }

    if (message.includes("failed to load")) {
        return "AssetLoadError";
    }

    if (/syntax|expected|unexpected/i.test(message)) {
        return "SyntaxError";
    }

    if (/compile|compilation|typst/i.test(message)) {
        return "TypstCompileError";
    }

    if (error instanceof TypeError) return "TypeError";
    if (error instanceof RangeError) return "RangeError";
    if (error instanceof Error && error.name && error.name !== "Error") {
        return error.name;
    }

    return "CompileError";
}

/**
 * Classifies an unhandled JavaScript or runtime error into a safe identifier.
 */
export function classifyJavaScriptError(error: unknown): string {
    if (error instanceof Error && error.name) {
        return error.name;
    }
    if (
        typeof error === "string" &&
        error.length < 32 &&
        !error.includes("@")
    ) {
        return error;
    }
    return "JavaScriptError";
}

/**
 * Registers global window error and unhandled promise rejection listeners.
 */
export function initErrorTracking(
    trackFn: (
        eventName: string,
        data?: Record<string, string | number | boolean>,
    ) => void,
): () => void {
    if (typeof window === "undefined") {
        return () => {};
    }

    const onError = (event: ErrorEvent) => {
        const errorType = classifyJavaScriptError(event.error ?? event.message);
        trackFn(AnalyticsEvents.JAVASCRIPT_ERROR, { error_type: errorType });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
        const errorType = classifyJavaScriptError(event.reason);
        trackFn(AnalyticsEvents.JAVASCRIPT_ERROR, { error_type: errorType });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
}
