import { describe, expect, it, vi } from "vitest";
import { getPageLoadMetrics, initPerformanceTracking } from "./performance.ts";
import { AnalyticsEvents } from "./types.ts";

describe("performance tracking", () => {
    it("returns null when window is undefined", () => {
        expect(getPageLoadMetrics()).toBeNull();
    });

    it("extracts metrics from Navigation Timing API", () => {
        const originalWindow = globalThis.window;
        const originalPerformance = globalThis.performance;

        const mockPerformance = {
            getEntriesByType: vi.fn().mockReturnValue([
                {
                    startTime: 0,
                    loadEventEnd: 850,
                    domContentLoadedEventEnd: 320,
                    responseStart: 120,
                    requestStart: 70,
                },
            ]),
        };

        // @ts-expect-error Mocking window
        globalThis.window = { performance: mockPerformance };
        // @ts-expect-error Mocking performance
        globalThis.performance = mockPerformance;

        const metrics = getPageLoadMetrics();
        expect(metrics).toEqual({
            load_time_ms: 850,
            dom_content_loaded_ms: 320,
            ttfb_ms: 50,
        });

        globalThis.window = originalWindow;
        globalThis.performance = originalPerformance;
    });

    it("registers load listener and triggers trackFn", async () => {
        const originalWindow = globalThis.window;
        const originalDocument = globalThis.document;
        const originalPerformance = globalThis.performance;

        const mockPerformance = {
            getEntriesByType: vi.fn().mockReturnValue([
                {
                    startTime: 0,
                    loadEventEnd: 500,
                    domContentLoadedEventEnd: 200,
                    responseStart: 50,
                    requestStart: 10,
                },
            ]),
        };

        const mockWindow = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            setTimeout: (fn: () => void) => {
                fn();
                return 1;
            },
            clearTimeout: vi.fn(),
            performance: mockPerformance,
        };

        // @ts-expect-error Mocking window
        globalThis.window = mockWindow;
        // @ts-expect-error Mocking performance
        globalThis.performance = mockPerformance;
        // @ts-expect-error Mocking document
        globalThis.document = { readyState: "complete" };

        const trackFn = vi.fn();
        const cleanup = initPerformanceTracking(trackFn);

        expect(trackFn).toHaveBeenCalledWith(
            AnalyticsEvents.PAGE_LOAD_PERFORMANCE,
            {
                load_time_ms: 500,
                dom_content_loaded_ms: 200,
                ttfb_ms: 40,
            },
        );

        cleanup();

        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
        globalThis.performance = originalPerformance;
    });
});
