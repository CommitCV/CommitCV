import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { contentSecurityPolicy } from "./csp.ts";

const server = createApp({
    distDir: "./server/test-dist",
});

describe("content security policy", () => {
    it("is sent on the SPA shell and on client-route fallbacks", async () => {
        for (const path of ["/index.html", "/editor"]) {
            const csp = (await server.request(path)).headers.get(
                "Content-Security-Policy",
            );
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("frame-ancestors 'none'");
        }
    });

    it("is not sent on assets or api responses", async () => {
        for (const path of ["/assets/app.js", "/api/oauth/providers"]) {
            const response = await server.request(path);
            expect(response.headers.get("Content-Security-Policy")).toBeNull();
        }
    });

    it("allows the Umami origin for scripts and connections only", () => {
        const csp = contentSecurityPolicy(
            "https://stats.example.com/script.js",
        );
        expect(csp).toContain(
            "script-src 'self' 'wasm-unsafe-eval' https://stats.example.com;",
        );
        expect(csp).toContain("connect-src 'self' https://stats.example.com;");
        expect(csp).not.toContain("default-src 'self' https://stats");
    });

    it("omits Umami when it is unset or not a URL", () => {
        for (const url of [undefined, "", "not a url"]) {
            expect(contentSecurityPolicy(url)).toContain(
                "script-src 'self' 'wasm-unsafe-eval';",
            );
        }
    });
});
