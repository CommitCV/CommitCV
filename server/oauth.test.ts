import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import { HandoffStore } from "./oauth-handoff.ts";
import { loadOAuthApps } from "./oauth-providers.ts";
import { safeReturnPath } from "./oauth.ts";

const SECRET_TOKEN = "tok_super_secret";
const REFRESH = "refresh_secret";

const apps = loadOAuthApps({
    OAUTH_GITHUB_CLIENT_ID: "gh-id",
    OAUTH_GITHUB_CLIENT_SECRET: "gh-secret",
    OAUTH_GITLAB_CLIENT_ID: "gl-id",
    OAUTH_GITLAB_CLIENT_SECRET: "gl-secret",
    OAUTH_BITBUCKET_CLIENT_ID: "bb-id",
    OAUTH_BITBUCKET_CLIENT_SECRET: "bb-secret",
    OAUTH_FORGEJO_INSTANCES: JSON.stringify({
        "Codeberg.org": { clientId: "cb-id", clientSecret: "cb-secret" },
        "bad host": { clientId: "x", clientSecret: "y" },
    }),
});

interface Call {
    url: string;
    init?: RequestInit;
}

function setup(
    opts: {
        publicUrl?: string;
        now?: () => number;
        handoff?: HandoffStore;
    } = {},
) {
    const calls: Call[] = [];
    const fetchFn = vi.fn(
        async (input: string | URL | Request, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, init });
            if (url.includes("/oauth/token") || url.includes("access_token")) {
                const body = String(init?.body);
                if (body.includes("code=bad")) {
                    return Response.json({ error: "bad_verification_code" });
                }
                return Response.json({
                    access_token: SECRET_TOKEN,
                    refresh_token: REFRESH,
                    expires_in: 7200,
                });
            }
            if (url.endsWith("/user")) {
                return Response.json({
                    login: "ada",
                    name: "Ada L",
                    email: "a@x.io",
                });
            }
            if (url.includes("/user/repos")) {
                return Response.json([
                    {
                        full_name: "ada/cv",
                        default_branch: "main",
                        private: true,
                    },
                    {
                        full_name: "ada/blog",
                        default_branch: "trunk",
                        private: false,
                    },
                ]);
            }
            if (url.endsWith("/generate")) {
                return Response.json({
                    full_name: "ada/my-cv",
                    default_branch: "main",
                    private: true,
                });
            }
            return Response.json({});
        },
    ) as unknown as typeof fetch;
    const publicUrl = opts.publicUrl ?? "http://localhost:8787";
    const app = createApp({
        env: { publicUrl },
        distDir: "./server/test-dist",
        fetchFn,
        oauth: { apps, sessionSecret: "s3cret", publicUrl, ...opts },
    });
    return { app, calls, fetchFn };
}

const cookieOf = (res: Response, name: string) =>
    res.headers
        .getSetCookie()
        .find((c) => c.startsWith(`${name}=`))
        ?.split(";")[0];

async function login(
    app: ReturnType<typeof setup>["app"],
    query = "provider=gitlab&host=gitlab.com",
) {
    const res = await app.request(`/api/oauth/login?${query}`);
    const location = new URL(res.headers.get("location") ?? "http://none");
    return {
        res,
        location,
        cookie: cookieOf(res, "oauth_tx") ?? "",
        state: location.searchParams.get("state") ?? "",
    };
}

const post = (path: string, init: RequestInit & { origin?: string } = {}) => ({
    path,
    init: {
        method: "POST",
        ...init,
        headers: {
            origin: init.origin ?? "http://localhost:8787",
            ...(init.headers as Record<string, string>),
        },
    },
});

describe("oauth providers + login", () => {
    it("lists only configured providers and hosts, without secrets", async () => {
        const { app } = setup();
        const res = await app.request("/api/oauth/providers");
        const text = await res.text();
        expect(JSON.parse(text).providers).toEqual([
            { provider: "github", hosts: ["github.com"] },
            { provider: "gitlab", hosts: ["gitlab.com"] },
            { provider: "bitbucket", hosts: ["bitbucket.org"] },
            { provider: "forgejo", hosts: ["codeberg.org"] },
        ]);
        expect(text).not.toMatch(/secret|gl-id/);
    });

    it("offers nothing without a session secret", async () => {
        const app = createApp({
            distDir: "./server/test-dist",
            oauth: { apps, sessionSecret: "" },
        });
        const res = await app.request("/api/oauth/providers");
        expect(await res.json()).toEqual({ providers: [] });
        const l = await app.request(
            "/api/oauth/login?provider=gitlab&host=gitlab.com",
        );
        expect(l.status).toBe(404);
    });

    it("404s unconfigured providers and hosts", async () => {
        const { app } = setup();
        for (const q of [
            "provider=gitea&host=gitea.com",
            "provider=gitlab&host=evil.example",
            "provider=nope&host=x",
        ]) {
            expect((await app.request(`/api/oauth/login?${q}`)).status).toBe(
                404,
            );
        }
    });

    it("redirects with PKCE, scope, strict redirect_uri and a safe cookie", async () => {
        const { app } = setup();
        const { res, location, cookie } = await login(app);
        expect(res.status).toBe(302);
        expect(location.origin + location.pathname).toBe(
            "https://gitlab.com/oauth/authorize",
        );
        const p = location.searchParams;
        expect(p.get("redirect_uri")).toBe(
            "http://localhost:8787/api/oauth/callback",
        );
        expect(p.get("code_challenge_method")).toBe("S256");
        expect(p.get("code_challenge")).toBeTruthy();
        expect(p.get("scope")).toContain("write_repository");
        expect(p.get("client_secret")).toBeNull();
        const raw = res.headers
            .getSetCookie()
            .find((c) => c.startsWith("oauth_tx="))!;
        expect(raw).toMatch(/HttpOnly/i);
        expect(raw).toMatch(/SameSite=Lax/i);
        expect(raw).not.toMatch(/Secure/i);
        expect(cookie).toBeTruthy();
    });

    it("sets Secure cookies for an https PUBLIC_URL; bitbucket skips PKCE", async () => {
        const { app } = setup({ publicUrl: "https://cv.example" });
        const { res, location } = await login(
            app,
            "provider=bitbucket&host=bitbucket.org",
        );
        expect(res.headers.getSetCookie()[0]).toMatch(/Secure/i);
        expect(location.searchParams.get("code_challenge")).toBeNull();
        expect(location.searchParams.get("redirect_uri")).toBe(
            "https://cv.example/api/oauth/callback",
        );
    });

    it("validates the return path", () => {
        expect(safeReturnPath("/library?x=1")).toBe("/library?x=1");
        for (const bad of [
            undefined,
            "https://evil.com",
            "//evil.com",
            "/\\evil.com",
            "/a\nb",
            "javascript:alert(1)",
            "/.//evil.com",
            "/..//x",
            "/a/..//evil.com",
        ]) {
            expect(safeReturnPath(bad)).toBe("/connect");
        }
    });

    it("never returns a protocol-relative path", () => {
        for (const input of [
            "/ok",
            "/a/./b?q=//x",
            "/%2F%2Fevil.com",
            "/.//e",
        ]) {
            expect(safeReturnPath(input)).toMatch(/^\/(?![/\\])/);
        }
    });
});

describe("oauth callback", () => {
    it("rejects a missing, mismatched or tampered state", async () => {
        const { app, fetchFn } = setup();
        const { cookie, state } = await login(app);
        const tampered = cookie.replace(/.$/, (ch) => (ch === "A" ? "B" : "A"));
        for (const [qs, ck] of [
            [`code=c&state=${state}`, ""],
            [`code=c&state=nope`, cookie],
            [`code=c&state=${state}`, tampered],
        ]) {
            const res = await app.request(`/api/oauth/callback?${qs}`, {
                headers: { cookie: ck },
            });
            expect(res.status).toBe(400);
            expect(res.headers.get("set-cookie") ?? "").not.toContain(
                "oauth_handoff",
            );
        }
        expect(fetchFn).not.toHaveBeenCalled();
    });

    it("rejects an expired transaction", async () => {
        let t = 1_000_000;
        const { app } = setup({ now: () => t });
        const { cookie, state } = await login(app);
        t += 11 * 60_000;
        const res = await app.request(
            `/api/oauth/callback?code=c&state=${state}`,
            {
                headers: { cookie },
            },
        );
        expect(res.status).toBe(400);
    });

    it("exchanges the code with the PKCE verifier and hands off via nonce, not URL", async () => {
        const { app, calls } = setup();
        const { cookie, state } = await login(
            app,
            "provider=gitlab&host=gitlab.com&return=/connect",
        );
        const res = await app.request(
            `/api/oauth/callback?code=good&state=${state}`,
            {
                headers: { cookie },
            },
        );
        expect(res.status).toBe(302);
        const location = res.headers.get("location") ?? "";
        expect(location).toBe("/connect?signed_in=gitlab");
        expect(JSON.stringify([...res.headers])).not.toContain(SECRET_TOKEN);

        const exchange = calls.find(
            (c) => c.url === "https://gitlab.com/oauth/token",
        )!;
        const body = new URLSearchParams(String(exchange.init?.body));
        expect(body.get("code")).toBe("good");
        expect(body.get("code_verifier")?.length).toBeGreaterThan(40);
        expect(body.get("client_secret")).toBe("gl-secret");
        expect(body.get("redirect_uri")).toBe(
            "http://localhost:8787/api/oauth/callback",
        );

        const handoff = res.headers
            .getSetCookie()
            .find((c) => c.startsWith("oauth_handoff="))!;
        expect(handoff).toMatch(/HttpOnly/i);
        expect(handoff).toMatch(/Max-Age=60/i);
        expect(handoff).not.toContain(SECRET_TOKEN);
    });

    it("sends the verifier that matches the challenge", async () => {
        const { app, calls } = setup();
        const { cookie, state, location } = await login(app);
        await app.request(`/api/oauth/callback?code=good&state=${state}`, {
            headers: { cookie },
        });
        const body = new URLSearchParams(String(calls[0].init?.body));
        const { createHash } = await import("node:crypto");
        expect(
            createHash("sha256")
                .update(body.get("code_verifier")!)
                .digest("base64url"),
        ).toBe(location.searchParams.get("code_challenge"));
    });

    it("redirects with a readable error when the exchange fails or access is denied", async () => {
        const { app } = setup();
        const a = await login(app);
        const bad = await app.request(
            `/api/oauth/callback?code=bad&state=${a.state}`,
            {
                headers: { cookie: a.cookie },
            },
        );
        expect(bad.headers.get("location")).toBe(
            "/connect?signin_error=exchange_failed",
        );
        expect(bad.headers.get("set-cookie") ?? "").not.toContain(
            "oauth_handoff",
        );
        const b = await login(app);
        const denied = await app.request(
            `/api/oauth/callback?error=access_denied&state=${b.state}`,
            { headers: { cookie: b.cookie } },
        );
        expect(denied.headers.get("location")).toBe(
            "/connect?signin_error=denied",
        );
    });

    it("never logs tokens or codes", async () => {
        const spies = (["log", "warn", "error", "info"] as const).map((m) =>
            vi.spyOn(console, m).mockImplementation(() => {}),
        );
        const { app } = setup();
        const { cookie, state } = await login(app);
        await app.request(`/api/oauth/callback?code=good&state=${state}`, {
            headers: { cookie },
        });
        for (const spy of spies) {
            expect(JSON.stringify(spy.mock.calls)).not.toContain(SECRET_TOKEN);
            spy.mockRestore();
        }
    });
});

async function signedIn(app: ReturnType<typeof setup>["app"]) {
    const { cookie, state } = await login(app);
    const res = await app.request(
        `/api/oauth/callback?code=good&state=${state}`,
        {
            headers: { cookie },
        },
    );
    return cookieOf(res, "oauth_handoff") ?? "";
}

describe("handoff", () => {
    it("returns the token once, with no-store, and clears the cookie", async () => {
        const { app } = setup();
        const nonce = await signedIn(app);
        const h = post("/api/oauth/handoff", { headers: { cookie: nonce } });
        const res = await app.request(h.path, h.init);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(await res.json()).toMatchObject({
            provider: "gitlab",
            host: "gitlab.com",
            accessToken: SECRET_TOKEN,
            refreshToken: REFRESH,
            user: { name: "Ada L", login: "ada", email: "a@x.io" },
        });
        const again = await app.request(h.path, h.init);
        expect(again.status).toBe(410);
    });

    it("requires a same-origin POST", async () => {
        const { app } = setup();
        const nonce = await signedIn(app);
        const evil = post("/api/oauth/handoff", {
            origin: "https://evil.com",
            headers: { cookie: nonce },
        });
        expect((await app.request(evil.path, evil.init)).status).toBe(403);
        const none = await app.request("/api/oauth/handoff", {
            method: "POST",
            headers: { cookie: nonce },
        });
        expect(none.status).toBe(403);
        // The rejected attempts did not burn the nonce.
        const ok = post("/api/oauth/handoff", { headers: { cookie: nonce } });
        expect((await app.request(ok.path, ok.init)).status).toBe(200);
    });

    it("expires after the TTL", async () => {
        let t = 5_000;
        const { app } = setup({ now: () => t });
        const nonce = await signedIn(app);
        t += 61_000;
        const h = post("/api/oauth/handoff", { headers: { cookie: nonce } });
        expect((await app.request(h.path, h.init)).status).toBe(410);
    });

    it("rejects an unknown nonce", async () => {
        const { app } = setup();
        const h = post("/api/oauth/handoff", {
            headers: { cookie: "oauth_handoff=guess" },
        });
        expect((await app.request(h.path, h.init)).status).toBe(410);
    });
});

describe("HandoffStore", () => {
    const payload = {
        provider: "github",
        host: "github.com",
        accessToken: "t",
        user: { name: "", login: "" },
    };

    it("is single use and expires", () => {
        let t = 0;
        const store = new HandoffStore(() => t, 60_000);
        const n = store.put(payload)!;
        expect(store.take(n)?.accessToken).toBe("t");
        expect(store.take(n)).toBeUndefined();
        const m = store.put(payload)!;
        t = 60_000;
        expect(store.take(m)).toBeUndefined();
    });

    it("caps live entries and frees expired ones", () => {
        let t = 0;
        const store = new HandoffStore(() => t, 1000, 2);
        expect(store.put(payload)).toBeTruthy();
        expect(store.put(payload)).toBeTruthy();
        expect(store.put(payload)).toBeUndefined();
        t = 1000;
        expect(store.put(payload)).toBeTruthy();
    });
});

describe("refresh", () => {
    const body = (extra = {}) => ({
        body: JSON.stringify({
            provider: "gitlab",
            host: "gitlab.com",
            refreshToken: REFRESH,
            ...extra,
        }),
    });

    it("exchanges a refresh token server-side with the client secret", async () => {
        const { app, calls } = setup({ now: () => 1000 });
        const r = post("/api/oauth/refresh", body());
        const res = await app.request(r.path, r.init);
        expect(await res.json()).toEqual({
            accessToken: SECRET_TOKEN,
            refreshToken: REFRESH,
            expiresAt: 1000 + 7200_000,
        });
        const sent = new URLSearchParams(String(calls[0].init?.body));
        expect(sent.get("grant_type")).toBe("refresh_token");
        expect(sent.get("refresh_token")).toBe(REFRESH);
        expect(sent.get("client_secret")).toBe("gl-secret");
    });

    it("uses basic auth for bitbucket and rejects bad requests", async () => {
        const { app, calls } = setup();
        const r = post(
            "/api/oauth/refresh",
            body({ provider: "bitbucket", host: "bitbucket.org" }),
        );
        await app.request(r.path, r.init);
        expect(
            (calls[0].init?.headers as Record<string, string>).Authorization,
        ).toMatch(/^Basic /);
        const cross = post("/api/oauth/refresh", {
            ...body(),
            origin: "https://evil.com",
        });
        expect((await app.request(cross.path, cross.init)).status).toBe(403);
        const unknown = post(
            "/api/oauth/refresh",
            body({ host: "evil.example" }),
        );
        expect((await app.request(unknown.path, unknown.init)).status).toBe(
            404,
        );
        const missing = post("/api/oauth/refresh", body({ refreshToken: "" }));
        expect((await app.request(missing.path, missing.init)).status).toBe(
            400,
        );
    });
});

describe("repos", () => {
    const get = (
        app: ReturnType<typeof setup>["app"],
        q: string,
        token = "Bearer abc",
    ) =>
        app.request(`/api/oauth/repos?${q}`, {
            headers: token ? { authorization: token } : {},
        });

    it("lists repos, builds clone urls, filters, and forwards the token only to the allowed host", async () => {
        const { app, calls } = setup();
        const res = await get(app, "provider=forgejo&host=codeberg.org&q=CV");
        expect(await res.json()).toEqual({
            repos: [
                {
                    fullName: "ada/cv",
                    cloneUrl: "https://codeberg.org/ada/cv",
                    defaultBranch: "main",
                    private: true,
                },
            ],
        });
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toMatch(
            /^https:\/\/codeberg\.org\/api\/v1\/user\/repos/,
        );
        expect(
            (calls[0].init?.headers as Record<string, string>).Authorization,
        ).toBe("Bearer abc");
    });

    it("refuses hosts that are not configured and requires a token", async () => {
        const { app, fetchFn } = setup();
        expect(
            (await get(app, "provider=forgejo&host=evil.example")).status,
        ).toBe(404);
        expect(
            (await get(app, "provider=gitlab&host=169.254.169.254")).status,
        ).toBe(404);
        expect(
            (await get(app, "provider=gitlab&host=gitlab.com", "")).status,
        ).toBe(401);
        expect(
            (await get(app, "provider=gitlab&host=gitlab.com", "Basic xyz"))
                .status,
        ).toBe(401);
        expect(fetchFn).not.toHaveBeenCalled();
    });

    it("reports a rejected token", async () => {
        const app = createApp({
            distDir: "./server/test-dist",
            fetchFn: async () => new Response("no", { status: 401 }),
            oauth: { apps, sessionSecret: "s" },
        });
        expect((await get(app, "provider=github&host=github.com")).status).toBe(
            401,
        );
    });
});

describe("github app repos", () => {
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/user/installations?")) {
            return Response.json({ installations: [{ id: 7 }, { id: 8 }] });
        }
        if (url.includes("/user/installations/7/repositories")) {
            return Response.json({
                repositories: [
                    {
                        full_name: "ada/cv",
                        default_branch: "main",
                        private: true,
                    },
                ],
            });
        }
        if (url.includes("/user/installations/8/repositories")) {
            return Response.json({
                repositories: [
                    {
                        full_name: "org/resumes",
                        default_branch: "main",
                        private: true,
                    },
                ],
            });
        }
        return new Response("unexpected", { status: 500 });
    });
    const request = (slug?: string) =>
        createApp({
            distDir: "./server/test-dist",
            fetchFn,
            oauth: { apps, sessionSecret: "s", githubAppSlug: slug },
        }).request("/api/oauth/repos?provider=github&host=github.com", {
            headers: { authorization: "Bearer abc" },
        });

    it("lists only repos from the app's installations, not /user/repos", async () => {
        const res = await request("commitcv");
        const body = (await res.json()) as {
            repos: { fullName: string }[];
            installUrl?: string;
        };
        expect(body.repos.map((r) => r.fullName)).toEqual([
            "ada/cv",
            "org/resumes",
        ]);
        expect(body.installUrl).toBe(
            "https://github.com/apps/commitcv/installations/new",
        );
        expect(
            fetchFn.mock.calls.some(([u]) => String(u).includes("/user/repos")),
        ).toBe(false);
    });

    it("omits the install link without a slug", async () => {
        const body = (await (await request()).json()) as {
            installUrl?: string;
        };
        expect(body.installUrl).toBeUndefined();
    });
});

describe("generate from template", () => {
    const gen = (
        app: ReturnType<typeof setup>["app"],
        body: unknown,
        token = "Bearer abc",
    ) =>
        app.request("/api/oauth/github/generate-from-template", {
            method: "POST",
            headers: {
                authorization: token,
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
        });

    it("creates a private repo from the template", async () => {
        const { app, calls } = setup();
        const res = await gen(app, {
            template: "commitcv/template",
            name: "my-cv",
        });
        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({
            fullName: "ada/my-cv",
            private: true,
        });
        expect(calls[0].url).toBe(
            "https://api.github.com/repos/commitcv/template/generate",
        );
        expect(JSON.parse(String(calls[0].init?.body)).private).toBe(true);
    });

    it("validates owner, repo and name and requires a token", async () => {
        const { app, fetchFn } = setup();
        for (const body of [
            { template: "a/b/c", name: "x" },
            { template: "../x/y", name: "x" },
            { template: "a/b", name: "x/y" },
            { template: "a/b", name: "" },
            {},
        ]) {
            expect((await gen(app, body)).status).toBe(400);
        }
        expect(
            (await gen(app, { template: "a/b", name: "x" }, "")).status,
        ).toBe(401);
        expect(fetchFn).not.toHaveBeenCalled();
    });
});
