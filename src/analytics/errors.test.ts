import { describe, expect, it, vi } from "vitest";
import {
    classifyCompileError,
    classifyJavaScriptError,
    initErrorTracking,
} from "./errors.ts";
import { AnalyticsEvents } from "./types.ts";

describe("classifyCompileError", () => {
    it("returns null for debounce cancellation messages", () => {
        const error = new Error("replaced by a newer render");
        expect(classifyCompileError(error)).toBeNull();
    });

    it("classifies worker crash", () => {
        const error = new Error("the Typst worker crashed");
        expect(classifyCompileError(error)).toBe("WorkerCrash");
    });

    it("classifies asset load failures", () => {
        const error = new Error("failed to load /fonts/fa-solid-900.otf");
        expect(classifyCompileError(error)).toBe("AssetLoadError");
    });

    it("classifies syntax errors", () => {
        const error = new Error("error: syntax error, expected identifier");
        expect(classifyCompileError(error)).toBe("SyntaxError");
    });

    it("classifies general compilation failure", () => {
        const error = new Error("Typst compilation failed");
        expect(classifyCompileError(error)).toBe("TypstCompileError");
    });

    it("classifies TypeErrors", () => {
        const error = new TypeError("Cannot read properties of undefined");
        expect(classifyCompileError(error)).toBe("TypeError");
    });

    it("falls back to CompileError without leaking message text", () => {
        const error = new Error(
            "Sensitive resume information: John Doe at Google",
        );
        expect(classifyCompileError(error)).toBe("CompileError");
    });
});

describe("classifyJavaScriptError", () => {
    it("extracts Error name", () => {
        expect(
            classifyJavaScriptError(new ReferenceError("foo is not defined")),
        ).toBe("ReferenceError");
        expect(
            classifyJavaScriptError(new TypeError("x is not a function")),
        ).toBe("TypeError");
    });

    it("handles non-Error objects safely", () => {
        expect(classifyJavaScriptError(42)).toBe("JavaScriptError");
        expect(classifyJavaScriptError({ message: "secret" })).toBe(
            "JavaScriptError",
        );
    });
});

describe("initErrorTracking", () => {
    it("attaches listeners and reports errors safely", () => {
        const originalWindow = globalThis.window;
        const listeners: Record<string, ((event: unknown) => void)[]> = {};

        const mockWindow = {
            addEventListener: vi.fn(
                (event: string, cb: (event: unknown) => void) => {
                    listeners[event] = listeners[event] || [];
                    listeners[event].push(cb);
                },
            ),
            removeEventListener: vi.fn(),
        };

        // @ts-expect-error Mocking window
        globalThis.window = mockWindow;

        const trackFn = vi.fn();
        const cleanup = initErrorTracking(trackFn);

        expect(mockWindow.addEventListener).toHaveBeenCalledWith(
            "error",
            expect.any(Function),
        );
        expect(mockWindow.addEventListener).toHaveBeenCalledWith(
            "unhandledrejection",
            expect.any(Function),
        );

        // Simulate error event
        listeners["error"]?.[0]?.({
            error: new TypeError("boom"),
            message: "boom",
        });

        expect(trackFn).toHaveBeenCalledWith(AnalyticsEvents.JAVASCRIPT_ERROR, {
            error_type: "TypeError",
        });

        // Simulate unhandled rejection
        listeners["unhandledrejection"]?.[0]?.({
            reason: new ReferenceError("unhandled"),
        });

        expect(trackFn).toHaveBeenCalledWith(AnalyticsEvents.JAVASCRIPT_ERROR, {
            error_type: "ReferenceError",
        });

        cleanup();
        expect(mockWindow.removeEventListener).toHaveBeenCalledTimes(2);

        globalThis.window = originalWindow;
    });
});
