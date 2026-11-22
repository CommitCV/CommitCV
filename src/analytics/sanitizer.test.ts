import { describe, expect, it } from "vitest";
import { sanitizeEventData } from "./sanitizer.ts";
import { AnalyticsEvents } from "./types.ts";

describe("sanitizeEventData", () => {
    describe("Privacy Policy Section 4.1 Usage Events compliance", () => {
        it("returns undefined for 'a resume was created' even if data is passed", () => {
            const result = sanitizeEventData(AnalyticsEvents.RESUME_CREATED, {
                title: "Software Engineer",
                name: "John Doe",
                email: "john@example.com",
            });
            expect(result).toBeUndefined();
        });

        it("returns undefined for 'a resume was downloaded as a pdf'", () => {
            const result = sanitizeEventData(
                AnalyticsEvents.RESUME_DOWNLOADED_PDF,
                { filename: "john_doe_resume.pdf" },
            );
            expect(result).toBeUndefined();
        });

        it("returns undefined for 'a resume was deleted'", () => {
            const result = sanitizeEventData(AnalyticsEvents.RESUME_DELETED, {
                id: "secret-uuid-1234",
            });
            expect(result).toBeUndefined();
        });

        it("returns undefined for 'a resume was imported'", () => {
            const result = sanitizeEventData(AnalyticsEvents.RESUME_IMPORTED, {
                raw_json: "{ name: 'Alice' }",
            });
            expect(result).toBeUndefined();
        });

        it("returns undefined for 'a resume was exported'", () => {
            const result = sanitizeEventData(AnalyticsEvents.RESUME_EXPORTED, {
                format: "typst",
            });
            expect(result).toBeUndefined();
        });
    });

    describe("Compile error sanitization", () => {
        it("allows only error_type and strips resume content or long messages", () => {
            const result = sanitizeEventData(
                AnalyticsEvents.RESUME_COMPILE_ERROR,
                {
                    error_type: "SyntaxError",
                    source_snippet: "John Doe #resume-header()",
                },
            );
            expect(result).toEqual({ error_type: "SyntaxError" });
        });

        it("rejects error_type containing '@' or path characters", () => {
            const result = sanitizeEventData(
                AnalyticsEvents.RESUME_COMPILE_ERROR,
                {
                    error_type: "user@example.com",
                },
            );
            expect(result).toBeUndefined();
        });
    });

    describe("JavaScript error sanitization", () => {
        it("allows safe error_type", () => {
            const result = sanitizeEventData(AnalyticsEvents.JAVASCRIPT_ERROR, {
                error_type: "TypeError",
            });
            expect(result).toEqual({ error_type: "TypeError" });
        });
    });

    describe("Page load performance sanitization", () => {
        it("preserves whitelisted non-negative performance numbers rounded", () => {
            const result = sanitizeEventData(
                AnalyticsEvents.PAGE_LOAD_PERFORMANCE,
                {
                    load_time_ms: 123.456,
                    dom_content_loaded_ms: 89.1,
                    ttfb_ms: 45.9,
                    illegal_property: "malicious",
                },
            );
            expect(result).toEqual({
                load_time_ms: 123,
                dom_content_loaded_ms: 89,
                ttfb_ms: 46,
            });
        });

        it("strips negative or non-finite numbers", () => {
            const result = sanitizeEventData(
                AnalyticsEvents.PAGE_LOAD_PERFORMANCE,
                {
                    load_time_ms: -50,
                    dom_content_loaded_ms: Infinity,
                    ttfb_ms: NaN,
                },
            );
            expect(result).toBeUndefined();
        });
    });
});
