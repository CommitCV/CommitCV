import { describe, expect, it } from "vitest";
import { sanitizeEventData, sanitizePagePath } from "./sanitizer.ts";
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

describe("sanitizePagePath", () => {
    it("drops OAuth return params such as signed_in and signin_error", () => {
        expect(sanitizePagePath("/library?signed_in=git.example.org")).toBe(
            "/library",
        );
        expect(sanitizePagePath("/signin?signin_error=access_denied")).toBe(
            "/signin",
        );
    });

    it("drops fragments and absolute origins", () => {
        expect(sanitizePagePath("/editor#token=abc")).toBe("/editor");
        expect(sanitizePagePath("https://commitcv.com/connect?x=1#y")).toBe(
            "/connect",
        );
    });

    it("keeps a plain path unchanged", () => {
        expect(sanitizePagePath("/about")).toBe("/about");
    });
});

describe("git event allowlist", () => {
    it("keeps only schema properties with allowed values", () => {
        expect(
            sanitizeEventData("git connected", {
                provider: "github",
                host_kind: "public",
                method: "oauth",
            }),
        ).toEqual({ provider: "github", host_kind: "public", method: "oauth" });
    });

    it("strips repo names, URLs, hosts, paths and unknown properties", () => {
        const result = sanitizeEventData("git connected", {
            provider: "github",
            repo: "ada/secret-cv",
            url: "https://github.com/ada/secret-cv",
            host: "git.corp.example",
            path: "resumes/ada.json",
            sha: "0123456789abcdef",
            message: "update my resume",
        });
        expect(result).toEqual({ provider: "github" });
    });

    it("drops values outside the enum, even harmless-looking ones", () => {
        const result = sanitizeEventData("git connect failed", {
            provider: "git.corp.example",
            host_kind: "public",
            error_class: "Error: token ghp_abc was rejected",
            method: 42,
        });
        expect(result).toEqual({ host_kind: "public" });
    });

    it("sends nothing for an unknown git event (fail closed)", () => {
        expect(
            sanitizeEventData("git something new", {
                provider: "github",
                repo: "ada/cv",
            }),
        ).toBeUndefined();
    });

    it("sends nothing when every property is rejected", () => {
        expect(
            sanitizeEventData("git history opened", { repo: "ada/cv" }),
        ).toBeUndefined();
    });

    it("does not apply the generic fallback to git events", () => {
        expect(
            sanitizeEventData("git commit completed", { count: 3, ok: true }),
        ).toBeUndefined();
    });
});
