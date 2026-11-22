import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import type { GitProxyOptions, Upstream } from "./git-proxy.ts";
import { isPublicAddress } from "./git-proxy.ts";

const env = {
    githubClientId: "cid",
    githubClientSecret: "secret",
    publicUrl: "https://cv.example.com",
};
const REFS =
    "/api/git-proxy/github.com/o/r.git/info/refs?service=git-upload-pack";
const hosts: Record<string, string> = {
    "github.com": "140.82.112.3",
    "gitlab.com": "8.8.8.8",
    "evil.example.com": "127.0.0.1",
    "meta.example.com": "169.254.169.254",
    "v6.example.com": "::1",
    "mapped.example.com": "::ffff:7f00:1",
    "mixed.example.com": "140.82.112.3,10.0.0.1",
};

function setup(options: Partial<GitProxyOptions> = {}, upstream?: Upstream) {
    const calls: Parameters<Upstream>[] = [];
    const fake: Upstream =
        upstream ??
        (async () => {
            return new Response("refs", {
                headers: {
                    "content-type":
                        "application/x-git-upload-pack-advertisement",
                    "set-cookie": "a=b",
                    connection: "close",
                },
            });
        });
    const server = createApp({
        env,
        distDir: "./server/test-dist",
        gitProxy: {
            resolve: async (host) =>
                (hosts[host]?.split(",") ?? []).map((address) => ({
                    address,
                    family: address.includes(":") ? 6 : 4,
                })),
            upstream: (...args) => {
                calls.push(args);
                return fake(...args);
            },
            ...options,
        },
    });
    return { server, calls };
}

afterEach(() => vi.restoreAllMocks());

describe("git proxy routing", () => {
    it("proxies info/refs and pins the resolved address", async () => {
        const { server, calls } = setup();
        const response = await server.request(REFS);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe("refs");
        expect(calls[0]?.[0].href).toBe(
            "https://github.com/o/r.git/info/refs?service=git-upload-pack",
        );
        expect(calls[0]?.[1].address.address).toBe("140.82.112.3");
    });

    it.each(["git-upload-pack", "git-receive-pack"])(
        "allows POST %s",
        async (name) => {
            const { server } = setup();
            const response = await server.request(
                `/api/git-proxy/gitlab.com/group/sub/r/${name}`,
                { method: "POST", body: "x" },
            );
            expect(response.status).toBe(200);
        },
    );

    it.each([
        ["/api/git-proxy/github.com/o/r.git/HEAD", "GET"],
        ["/api/git-proxy/github.com/o/r.git/info/refs", "GET"],
        ["/api/git-proxy/github.com/o/r.git/info/refs?service=x", "GET"],
        [
            "/api/git-proxy/github.com/o/r.git/info/refs?service=git-upload-pack&a=1",
            "GET",
        ],
        [
            "/api/git-proxy/github.com/o/r.git/info/refs?service=git-upload-pack",
            "POST",
        ],
        ["/api/git-proxy/github.com/git-upload-pack", "POST"],
        ["/api/git-proxy/github.com/o/r/git-upload-pack?x=1", "POST"],
        ["/api/git-proxy/github.com/o/r/git-upload-pack", "GET"],
        ["/api/git-proxy/github.com", "GET"],
    ])("404s %s %s", async (path, method) => {
        const { server, calls } = setup();
        const response = await server.request(path, { method });
        expect(response.status).toBe(404);
        expect(calls).toHaveLength(0);
    });

    it.each(["PUT", "DELETE", "PATCH"])("rejects %s", async (method) => {
        const response = await setup().server.request(REFS, { method });
        expect(response.status).toBe(403);
    });
});

describe("git proxy SSRF defenses", () => {
    it.each([
        "127.0.0.1",
        "2130706433",
        "0x7f.1",
        "[::1]",
        "localhost",
        "foo.localhost",
        "printer.local",
        "db.internal",
        "intranet",
        "user@github.com",
        "github.com:8443",
        "github.com.",
    ])("rejects host %s", async (host) => {
        const { server, calls } = setup();
        const response = await server.request(
            `/api/git-proxy/${host}/o/r/git-upload-pack`,
            { method: "POST" },
        );
        expect([403, 404]).toContain(response.status);
        expect(calls).toHaveLength(0);
    });

    it.each([
        "evil.example.com",
        "meta.example.com",
        "v6.example.com",
        "mapped.example.com",
        "mixed.example.com",
    ])("rejects %s resolving to a private address", async (host) => {
        const { server, calls } = setup();
        const response = await server.request(
            `/api/git-proxy/${host}/o/r.git/info/refs?service=git-upload-pack`,
        );
        expect(response.status).toBe(403);
        expect(calls).toHaveLength(0);
    });

    it("502s when DNS fails", async () => {
        const response = await setup().server.request(
            "/api/git-proxy/nope.example.com/o/r/git-upload-pack",
            { method: "POST" },
        );
        expect(response.status).toBe(502);
    });

    it.each([
        ["10.1.2.3", false],
        ["172.31.0.1", false],
        ["192.168.1.1", false],
        ["100.64.0.1", false],
        ["0.0.0.0", false],
        ["::", false],
        ["fd00::1", false],
        ["fe80::1", false],
        ["::ffff:10.0.0.1", false],
        ["8.8.8.8", true],
        ["::ffff:8.8.8.8", true],
        ["2606:4700::1111", true],
    ])("isPublicAddress(%s) is %s", (address, expected) => {
        expect(isPublicAddress(address)).toBe(expected);
    });

    it("re-validates redirects and drops the token cross-host", async () => {
        const urls: string[] = [];
        const auths: (string | undefined)[] = [];
        const upstream: Upstream = async (url, init) => {
            urls.push(url.href);
            auths.push(init.headers.authorization);
            return urls.length === 1
                ? new Response(null, {
                      status: 301,
                      headers: {
                          location:
                              "https://gitlab.com/o/r.git/info/refs?service=git-upload-pack",
                      },
                  })
                : new Response("ok");
        };
        const { server } = setup({}, upstream);
        const response = await server.request(REFS, {
            headers: { authorization: "Basic abc" },
        });
        expect(response.status).toBe(200);
        expect(auths).toEqual(["Basic abc", undefined]);
    });

    it("rejects a redirect to a private host", async () => {
        const upstream: Upstream = async () =>
            new Response(null, {
                status: 302,
                headers: {
                    location:
                        "https://meta.example.com/o/r.git/info/refs?service=git-upload-pack",
                },
            });
        const { server, calls } = setup({}, upstream);
        const response = await server.request(REFS);
        expect(response.status).toBe(403);
        expect(calls).toHaveLength(1);
    });

    it("rejects redirects to http, other paths, and POST redirects", async () => {
        for (const [location, method] of [
            [
                "http://github.com/o/r.git/info/refs?service=git-upload-pack",
                "GET",
            ],
            ["https://github.com/admin", "GET"],
            ["https://github.com/o/r/git-upload-pack", "POST"],
        ] as const) {
            const upstream: Upstream = async () =>
                new Response(null, { status: 307, headers: { location } });
            const response = await setup({}, upstream).server.request(
                method === "GET"
                    ? REFS
                    : "/api/git-proxy/github.com/o/r/git-upload-pack",
                { method },
            );
            expect(response.status).toBeGreaterThanOrEqual(403);
        }
    });

    it("gives up after too many redirects", async () => {
        const upstream: Upstream = async () =>
            new Response(null, {
                status: 302,
                headers: {
                    location: "/o/r.git/info/refs?service=git-upload-pack",
                },
            });
        const response = await setup({}, upstream).server.request(REFS);
        expect(response.status).toBe(502);
    });
});

describe("git proxy headers and CORS", () => {
    it("forwards only allowlisted headers and strips response cookies", async () => {
        const { server, calls } = setup();
        const response = await server.request(REFS, {
            headers: {
                authorization: "Basic abc",
                cookie: "gh_token=secret",
                "x-custom": "1",
                "git-protocol": "version=2",
            },
        });
        expect(calls[0]?.[1].headers).toEqual({
            "user-agent": "commitcv-git-proxy",
            authorization: "Basic abc",
            "git-protocol": "version=2",
        });
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(response.headers.get("connection")).toBeNull();
        expect(response.headers.get("content-type")).toContain(
            "git-upload-pack",
        );
    });

    it("keeps an upstream Basic challenge from reaching the browser", async () => {
        const { server } = setup(
            {},
            async () =>
                new Response("no", {
                    status: 401,
                    headers: { "www-authenticate": 'Basic realm="GitHub"' },
                }),
        );
        const response = await server.request(REFS);
        expect(response.status).toBe(401);
        expect(response.headers.get("www-authenticate")).toBeNull();
    });

    it("answers preflight for the public origin", async () => {
        const response = await setup().server.request(REFS, {
            method: "OPTIONS",
            headers: { origin: "https://cv.example.com" },
        });
        expect(response.status).toBe(204);
        expect(response.headers.get("access-control-allow-origin")).toBe(
            "https://cv.example.com",
        );
        expect(response.headers.get("access-control-allow-headers")).toContain(
            "authorization",
        );
    });

    it("allows the server's own origin and sets CORS on responses", async () => {
        const response = await setup().server.request(REFS, {
            headers: { origin: "https://app.test", host: "app.test" },
        });
        expect(response.status).toBe(200);
        expect(response.headers.get("access-control-allow-origin")).toBe(
            "https://app.test",
        );
    });

    it("rejects other origins, including preflight", async () => {
        for (const method of ["GET", "OPTIONS"]) {
            const response = await setup().server.request(REFS, {
                method,
                headers: { origin: "https://evil.test", host: "app.test" },
            });
            expect(response.status).toBe(403);
            expect(
                response.headers.get("access-control-allow-origin"),
            ).toBeNull();
        }
    });
});

describe("git proxy limits and switches", () => {
    it("rejects oversized bodies by content-length and by streaming", async () => {
        const { server } = setup({ maxBodyBytes: 4 });
        const path = "/api/git-proxy/github.com/o/r/git-receive-pack";
        const declared = await server.request(path, {
            method: "POST",
            body: "12345",
            headers: { "content-length": "5" },
        });
        expect(declared.status).toBe(413);

        // Undeclared length: the cap trips while the body streams.
        const upstream: Upstream = async (_url, init) => {
            await new Response(init.body).arrayBuffer();
            return new Response("ok");
        };
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode("12345"));
                controller.close();
            },
        });
        const streamed = await setup(
            { maxBodyBytes: 4 },
            upstream,
        ).server.request(path, {
            method: "POST",
            body: stream,
            duplex: "half",
        });
        expect(streamed.status).toBe(413);
    });

    it("rate limits per client and resets after a minute", async () => {
        let time = 0;
        const { server } = setup({ rateLimitPerMinute: 2, now: () => time });
        const get = (ip: string) =>
            server.request(REFS, { headers: { "x-forwarded-for": ip } });
        expect((await get("1.1.1.1")).status).toBe(200);
        expect((await get("1.1.1.1")).status).toBe(200);
        expect((await get("1.1.1.1")).status).toBe(429);
        expect((await get("2.2.2.2")).status).toBe(200);
        time = 60_001;
        expect((await get("1.1.1.1")).status).toBe(200);
    });

    it("504s on upstream timeout and 502s on failure", async () => {
        const hang: Upstream = (_url, init) =>
            new Promise((_resolve, reject) =>
                init.signal.addEventListener("abort", () =>
                    reject(new Error("x")),
                ),
            );
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const slow = await setup({ timeoutMs: 10 }, hang).server.request(REFS);
        expect(slow.status).toBe(504);
        const broken = await setup({}, async () => {
            throw new Error("boom");
        }).server.request(REFS);
        expect(broken.status).toBe(502);
    });

    it("never logs the Authorization value", async () => {
        const spies = (["log", "warn", "error", "info"] as const).map((m) =>
            vi.spyOn(console, m).mockImplementation(() => {}),
        );
        await setup({}, async () => {
            throw new Error("boom Basic supersecret");
        }).server.request(REFS, {
            headers: { authorization: "Basic supersecret" },
        });
        const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
        expect(logged).toContain("github.com");
        expect(logged).not.toContain("supersecret");
    });

    it("honours the kill switch", async () => {
        const { server, calls } = setup({ disabled: true });
        expect((await server.request(REFS)).status).toBe(403);
        expect(calls).toHaveLength(0);
    });

    it("enforces the host allowlist", async () => {
        const { server } = setup({ allowedHosts: ["gitlab.com"] });
        expect((await server.request(REFS)).status).toBe(403);
        const ok = await server.request(
            "/api/git-proxy/gitlab.com/o/r/git-upload-pack",
            { method: "POST" },
        );
        expect(ok.status).toBe(200);
    });
});
