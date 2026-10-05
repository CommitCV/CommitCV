import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";

const server = createApp({
    env: { githubClientId: "cid", githubClientSecret: "secret" },
    distDir: "./server/test-dist",
});

describe("static serving", () => {
    it("serves built assets", async () => {
        const response = await server.request("/assets/app.js");
        expect(response.status).toBe(200);
        expect(await response.text()).toContain("app");
    });

    it("falls back to the SPA for client routes", async () => {
        const response = await server.request("/editor");
        expect(response.status).toBe(200);
        expect(await response.text()).toContain("index-html");
    });

    it("does not fall back for missing assets", async () => {
        const response = await server.request("/assets/missing.js");
        expect(response.status).toBe(404);
    });

    it("does not fall back for unknown api routes", async () => {
        const response = await server.request("/api/nope");
        expect(response.status).toBe(404);
    });
});
