import { AnalyticsEvents, type IPerformanceData } from "./types.ts";

/**
 * Extracts page load performance timings using the Navigation Timing API.
 */
export function getPageLoadMetrics(): IPerformanceData | null {
    if (typeof window === "undefined" || !window.performance) {
        return null;
    }

    try {
        const navEntries = window.performance.getEntriesByType?.("navigation");
        if (navEntries && navEntries.length > 0) {
            const nav = navEntries[0] as PerformanceNavigationTiming;
            const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
            const domContentLoaded = Math.round(
                nav.domContentLoadedEventEnd - nav.startTime,
            );
            const ttfb = Math.round(nav.responseStart - nav.requestStart);

            if (loadTime > 0) {
                return {
                    load_time_ms: Math.max(0, loadTime),
                    dom_content_loaded_ms: Math.max(0, domContentLoaded),
                    ttfb_ms: Math.max(0, ttfb),
                };
            }
        }

        // Fallback for older Navigation Timing
        const timing = window.performance.timing;
        if (timing && timing.navigationStart > 0 && timing.loadEventEnd > 0) {
            const loadTime = Math.round(
                timing.loadEventEnd - timing.navigationStart,
            );
            const domContentLoaded = Math.round(
                timing.domContentLoadedEventEnd - timing.navigationStart,
            );
            const ttfb = Math.round(timing.responseStart - timing.requestStart);

            if (loadTime > 0) {
                return {
                    load_time_ms: Math.max(0, loadTime),
                    dom_content_loaded_ms: Math.max(0, domContentLoaded),
                    ttfb_ms: Math.max(0, ttfb),
                };
            }
        }
    } catch {
        return null;
    }

    return null;
}

/**
 * Automatically captures and tracks page load performance once page loading is complete.
 */
export function initPerformanceTracking(
    trackFn: (
        eventName: string,
        data?: Record<string, string | number | boolean>,
    ) => void,
): () => void {
    if (typeof window === "undefined") {
        return () => {};
    }

    let timeoutId: number | undefined;

    const recordMetrics = () => {
        // Wait briefly for all load events and timings to settle
        timeoutId = window.setTimeout(() => {
            const metrics = getPageLoadMetrics();
            if (metrics) {
                trackFn(
                    AnalyticsEvents.PAGE_LOAD_PERFORMANCE,
                    metrics as unknown as Record<string, number>,
                );
            }
        }, 150);
    };

    if (document.readyState === "complete") {
        recordMetrics();
    } else {
        window.addEventListener("load", recordMetrics, { once: true });
    }

    return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        window.removeEventListener("load", recordMetrics);
    };
}
