import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import type { GitProxyOptions, Upstream } from "./git-proxy.ts";

const REFS =
    "/api/git-proxy/github.com/o/r.git/info/refs?service=git-upload-pack";

function setup(options: Partial<GitProxyOptions>, upstream: Upstream) {
    return createApp({
        env: {
            githubClientId: "cid",
            githubClientSecret: "secret",
            publicUrl: "https://cv.example.com",
        },
        distDir: "./server/test-dist",
        gitProxy: {
            resolve: async () => [{ address: "140.82.112.3", family: 4 }],
            upstream,
            ...options,
        },
    });
}

const bytes = (n: number) => new Uint8Array(n);

afterEach(() => vi.restoreAllMocks());

describe("git proxy malformed input", () => {
    it("400s a host that is not a valid URL host", async () => {
        const upstream = vi.fn<Upstream>();
        const response = await setup({}, upstream).request(
            "/api/git-proxy/a%00b.com/x/y/info/refs?service=git-upload-pack",
        );
        expect(response.status).toBe(400);
        expect(upstream).not.toHaveBeenCalled();
    });

    it("502s an upstream redirect whose Location is not a URL", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const response = await setup(
            {},
            async () =>
                new Response(null, {
                    status: 302,
                    headers: { location: "https://[bad" },
                }),
        ).request(REFS);
        expect(response.status).toBe(502);
    });
});

describe("git proxy response limits", () => {
    it("cuts a response that streams past the byte cap", async () => {
        const upstream: Upstream = async () =>
            new Response(
                new ReadableStream({
                    start(controller) {
                        for (let i = 0; i < 100; i++) {
                            controller.enqueue(bytes(4));
                        }
                        controller.close();
                    },
                }),
            );
        const response = await setup(
            { maxResponseBytes: 10 },
            upstream,
        ).request(REFS);
        await expect(response.arrayBuffer()).rejects.toThrow();
    });

    it("502s when the declared length is over the cap", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const response = await setup(
            { maxResponseBytes: 10 },
            async () =>
                new Response("x", { headers: { "content-length": "11" } }),
        ).request(REFS);
        expect(response.status).toBe(502);
    });

    it("cuts a body that stalls past the total deadline", async () => {
        // Ignores the abort signal, like a peer that trickles forever.
        const upstream: Upstream = async () =>
            new Response(
                new ReadableStream({
                    start(controller) {
                        controller.enqueue(bytes(1));
                    },
                }),
            );
        const response = await setup({ deadlineMs: 30 }, upstream).request(
            REFS,
        );
        await expect(response.arrayBuffer()).rejects.toThrow();
    });

    it("passes a normal response through untouched", async () => {
        const response = await setup(
            { maxResponseBytes: 10, deadlineMs: 1000 },
            async () => new Response("refs"),
        ).request(REFS);
        expect(await response.text()).toBe("refs");
    });
});
