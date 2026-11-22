import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import type { Upstream } from "./git-proxy.ts";

const REFS =
    "/api/git-proxy/github.com/owner/repo.git/info/refs?service=git-upload-pack";

function loggedWhen(upstream: Upstream, timing = false) {
    if (timing) vi.stubEnv("GIT_PROXY_TIMING", "1");
    const spies = (["log", "warn", "error", "info"] as const).map((m) =>
        vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const app = createApp({
        publicUrl: "https://cv.example.com",
        distDir: "./server/test-dist",
        gitProxy: {
            resolve: async () => [{ address: "140.82.112.3", family: 4 }],
            upstream,
        },
    });
    return {
        request: () => app.request(REFS),
        lines: () => spies.flatMap((s) => s.mock.calls.map((c) => c.join(" "))),
    };
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
});

describe("git proxy logging", () => {
    it.each([
        [
            "an upstream error status and body",
            async () =>
                new Response("repository owner/repo not found", {
                    status: 404,
                }),
        ],
        [
            "a failed upstream request",
            async () => {
                throw new Error("connect owner/repo failed");
            },
        ],
    ] as [string, Upstream][])(
        "logs no repository path for %s",
        async (_name, upstream) => {
            const log = loggedWhen(upstream);
            await log.request();
            const lines = log.lines();
            expect(lines.length).toBeGreaterThan(0);
            for (const line of lines) {
                expect(line).toContain("github.com");
                expect(line).not.toMatch(/owner|repo/);
            }
        },
    );

    it("logs no repository path in the opt-in timing line", async () => {
        const log = loggedWhen(async () => new Response("refs"), true);
        await (await log.request()).text();
        const lines = log.lines();
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) expect(line).not.toMatch(/owner|repo/);
    });
});
