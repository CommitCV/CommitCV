import {
    createHash,
    createHmac,
    randomBytes,
    timingSafeEqual,
} from "node:crypto";
import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HandoffStore } from "./oauth-handoff.ts";
import type { HandoffPayload } from "./oauth-handoff.ts";
import { endpoint, SPECS } from "./oauth-providers.ts";
import type { OAuthApp, OAuthProviderId } from "./oauth-providers.ts";
import { oauthRepos } from "./oauth-repos.ts";

export interface OAuthOptions {
    publicUrl: string;
    apps: OAuthApp[];
    /** HMAC key for the transaction cookie; empty disables sign-in. */
    sessionSecret: string;
    fetchFn: typeof fetch;
    /** GitHub App slug, for the "choose repositories" link. */
    githubAppSlug?: string;
    now?: () => number;
    handoff?: HandoffStore;
}

interface Transaction {
    state: string;
    verifier: string;
    provider: OAuthProviderId;
    host: string;
    ret: string;
    exp: number;
}

export interface TokenSet {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
}

const TX_COOKIE = "oauth_tx";
const HANDOFF_COOKIE = "oauth_handoff";
const COOKIE_PATH = "/api/oauth";
const b64 = (data: Buffer | string) => Buffer.from(data).toString("base64url");

function sign(secret: string, value: string): string {
    return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}

/** Same-origin relative paths only; anything else becomes `/connect`. */
export function safeReturnPath(input: string | undefined): string {
    const fallback = "/connect";
    if (!input || !input.startsWith("/") || /^\/[/\\]/.test(input)) {
        return fallback;
    }
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\\]/.test(input)) return fallback;
    try {
        const url = new URL(input, "http://local.invalid");
        if (url.origin !== "http://local.invalid") return fallback;
        const path = url.pathname + url.search;
        // Dot segments can collapse to `//host`, which browsers treat as
        // another origin.
        return /^\/[/\\]/.test(path) ? fallback : path;
    } catch {
        return fallback;
    }
}

export function normalizeUser(json: unknown): HandoffPayload["user"] {
    const u = (json ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const login =
        str(u.login) || str(u.username) || str(u.nickname) || str(u.account_id);
    const name =
        str(u.name) || str(u.full_name) || str(u.display_name) || login;
    const email = str(u.email);
    return { name, login, ...(email && { email }) };
}

/** Authorization code + PKCE sign-in; tokens go to the browser, never stored. */
export function oauthApi(options: OAuthOptions): Hono {
    const { apps, fetchFn, publicUrl } = options;
    const now = options.now ?? Date.now;
    const store = options.handoff ?? new HandoffStore(now);
    const secure = publicUrl.startsWith("https:");
    const enabled = Boolean(options.sessionSecret);
    const redirectUri = `${publicUrl}/api/oauth/callback`;
    const cookieBase = {
        httpOnly: true,
        sameSite: "Lax",
        secure,
        path: COOKIE_PATH,
    } as const;

    const app = new Hono();
    app.use("*", async (c, next) => {
        await next();
        c.res.headers.set("Cache-Control", "no-store");
    });

    const find = (provider?: string, host?: string) =>
        enabled
            ? apps.find(
                  (a) =>
                      a.provider === provider &&
                      a.host === (host ?? "").toLowerCase(),
              )
            : undefined;

    const sameOrigin = (c: Context) => {
        const origin = c.req.header("origin");
        return (
            !!origin &&
            (origin === publicUrl || origin === new URL(c.req.url).origin)
        );
    };

    async function tokenRequest(
        a: OAuthApp,
        params: Record<string, string>,
    ): Promise<TokenSet> {
        const headers: Record<string, string> = {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        };
        const body = new URLSearchParams(params);
        if (SPECS[a.provider].basicAuth) {
            headers.Authorization = `Basic ${b64(`${a.clientId}:${a.clientSecret}`)}`;
        } else {
            body.set("client_id", a.clientId);
            body.set("client_secret", a.clientSecret);
        }
        const response = await fetchFn(endpoint(a, "token"), {
            method: "POST",
            headers,
            body,
        });
        const data = (await response.json().catch(() => ({}))) as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            error?: string;
            error_description?: string;
        };
        if (!response.ok || !data.access_token) {
            // Error codes only; never the body, which may hold tokens.
            console.error(
                `oauth ${a.provider}: token request failed (${response.status}) ${String(data.error ?? "")} ${String(data.error_description ?? "")}`.trim(),
            );
            throw new Error("token request failed");
        }
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || undefined,
            expiresAt: data.expires_in
                ? now() + data.expires_in * 1000
                : undefined,
        };
    }

    app.get("/providers", (c) => {
        const providers: { provider: string; hosts: string[] }[] = [];
        if (enabled) {
            for (const a of apps) {
                const entry = providers.find((p) => p.provider === a.provider);
                if (entry) entry.hosts.push(a.host);
                else providers.push({ provider: a.provider, hosts: [a.host] });
            }
        }
        return c.json({ providers });
    });

    app.get("/login", (c) => {
        const a = find(c.req.query("provider"), c.req.query("host"));
        if (!a) return c.json({ error: "provider not configured" }, 404);
        const spec = SPECS[a.provider];
        const tx: Transaction = {
            state: randomBytes(24).toString("base64url"),
            verifier: randomBytes(48).toString("base64url"),
            provider: a.provider,
            host: a.host,
            ret: safeReturnPath(c.req.query("return")),
            exp: now() + 600_000,
        };
        const payload = b64(JSON.stringify(tx));
        setCookie(
            c,
            TX_COOKIE,
            `${payload}.${sign(options.sessionSecret, payload)}`,
            {
                ...cookieBase,
                maxAge: 600,
            },
        );
        const params = new URLSearchParams({
            client_id: a.clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            state: tx.state,
        });
        if (spec.scope) params.set("scope", spec.scope);
        if (spec.pkce) {
            params.set(
                "code_challenge",
                createHash("sha256").update(tx.verifier).digest("base64url"),
            );
            params.set("code_challenge_method", "S256");
        }
        return c.redirect(`${endpoint(a, "authorize")}?${params}`);
    });

    function readTransaction(c: Context): Transaction | undefined {
        const raw = getCookie(c, TX_COOKIE);
        const [payload, mac] = raw?.split(".") ?? [];
        if (!payload || !mac) return undefined;
        if (!safeEqual(mac, sign(options.sessionSecret, payload))) {
            return undefined;
        }
        try {
            const tx = JSON.parse(
                Buffer.from(payload, "base64url").toString(),
            ) as Transaction;
            return tx.exp > now() ? tx : undefined;
        } catch {
            return undefined;
        }
    }

    app.get("/callback", async (c) => {
        const tx = enabled ? readTransaction(c) : undefined;
        const state = c.req.query("state");
        if (!tx || !state || !safeEqual(state, tx.state)) {
            return c.json({ error: "invalid state" }, 400);
        }
        deleteCookie(c, TX_COOKIE, { path: COOKIE_PATH });
        const fail = (reason: string) => {
            const url = new URL(tx.ret, "http://local.invalid");
            url.searchParams.set("signin_error", reason);
            return c.redirect(url.pathname + url.search);
        };
        const code = c.req.query("code");
        if (c.req.query("error") || !code) return fail("denied");
        const a = find(tx.provider, tx.host);
        if (!a) return fail("not_configured");

        let tokens: TokenSet;
        try {
            const params: Record<string, string> = {
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            };
            if (SPECS[a.provider].pkce) params.code_verifier = tx.verifier;
            tokens = await tokenRequest(a, params);
        } catch (error) {
            console.error(
                `oauth ${a.provider}: exchange failed: ${error instanceof Error ? error.message : "unknown"}`,
            );
            return fail("exchange_failed");
        }

        let user: HandoffPayload["user"] = { name: "", login: "" };
        try {
            const response = await fetchFn(
                `${SPECS[a.provider].apiBase(a.host)}/user`,
                {
                    headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                        Accept: "application/json",
                    },
                },
            );
            if (response.ok) {
                user = normalizeUser(await response.json());
            } else {
                console.error(
                    `oauth ${a.provider}: user lookup failed (${response.status})`,
                );
            }
        } catch {
            // The page asks for the author instead.
        }

        const nonce = store.put({
            provider: a.provider,
            host: a.host,
            ...tokens,
            user,
        });
        if (!nonce) return fail("busy");
        setCookie(c, HANDOFF_COOKIE, nonce, { ...cookieBase, maxAge: 60 });
        const url = new URL(tx.ret, "http://local.invalid");
        url.searchParams.set("signed_in", a.provider);
        return c.redirect(url.pathname + url.search);
    });

    app.post("/handoff", (c) => {
        if (!sameOrigin(c)) return c.json({ error: "forbidden" }, 403);
        const nonce = getCookie(c, HANDOFF_COOKIE);
        deleteCookie(c, HANDOFF_COOKIE, { path: COOKIE_PATH });
        const payload = nonce ? store.take(nonce) : undefined;
        if (!payload) return c.json({ error: "sign-in expired" }, 410);
        return c.json(payload);
    });

    app.post("/refresh", async (c) => {
        if (!sameOrigin(c)) return c.json({ error: "forbidden" }, 403);
        const body = (await c.req.json().catch(() => ({}))) as {
            provider?: string;
            host?: string;
            refreshToken?: string;
        };
        const a = find(body.provider, body.host);
        if (!a) return c.json({ error: "provider not configured" }, 404);
        if (!body.refreshToken || typeof body.refreshToken !== "string") {
            return c.json({ error: "refreshToken required" }, 400);
        }
        try {
            return c.json(
                await tokenRequest(a, {
                    grant_type: "refresh_token",
                    refresh_token: body.refreshToken,
                }),
            );
        } catch {
            return c.json({ error: "refresh failed" }, 401);
        }
    });

    app.route(
        "/",
        oauthRepos({
            apps: enabled ? apps : [],
            fetchFn,
            githubAppSlug: options.githubAppSlug,
        }),
    );
    return app;
}
