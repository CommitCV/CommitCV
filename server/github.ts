import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export interface ServerEnv {
    githubClientId: string;
    githubClientSecret: string;
    publicUrl: string;
    fetchFn: typeof fetch;
}

/**
 * GitHub OAuth and the GitHub API proxy. The user's token only ever
 * lives in an httpOnly cookie on this server; the browser talks to
 * `/api/github/*` and this forwards to `api.github.com`.
 */
export function githubApi(env: ServerEnv): Hono {
    const app = new Hono();

    // ── OAuth ──────────────────────────────

    app.get("/auth/login", (c) => {
        if (!env.githubClientId || !env.githubClientSecret) {
            return c.json(
                { error: "server is not configured for GitHub" },
                500,
            );
        }
        const state = crypto.randomUUID();
        setCookie(c, "gh_state", state, {
            httpOnly: true,
            sameSite: "Lax",
            path: "/api/auth",
            maxAge: 600,
        });
        const params = new URLSearchParams({
            client_id: env.githubClientId,
            redirect_uri: `${env.publicUrl}/api/auth/callback`,
            scope: "repo,read:user",
            state,
        });
        return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
    });

    app.get("/auth/callback", async (c) => {
        const url = new URL(c.req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state || state !== getCookie(c, "gh_state")) {
            return c.json({ error: "invalid state" }, 400);
        }
        const response = await env.fetchFn(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: env.githubClientId,
                    client_secret: env.githubClientSecret,
                    code,
                }),
            },
        );
        const data = (await response.json()) as { access_token?: string };
        if (!data.access_token) {
            return c.json({ error: "code exchange failed" }, 502);
        }
        setCookie(c, "gh_token", data.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            path: "/",
            maxAge: 8 * 3600,
        });
        deleteCookie(c, "gh_state", { path: "/api/auth" });
        return c.redirect("/");
    });

    app.get("/auth/session", async (c) => {
        const token = getCookie(c, "gh_token");
        if (!token) return c.json({ authenticated: false });
        const response = await env.fetchFn("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        if (!response.ok) return c.json({ authenticated: false });
        const user = (await response.json()) as { login?: string };
        return c.json({ authenticated: true, login: user.login ?? "user" });
    });

    app.post("/auth/logout", (c) => {
        deleteCookie(c, "gh_token", { path: "/" });
        return c.json({ ok: true });
    });

    // ── API proxy ──────────────────────────

    const MAX_BODY_BYTES = 1_000_000;

    app.all("/github/*", async (c) => {
        const token = getCookie(c, "gh_token");
        if (!token) return c.json({ error: "sign in first" }, 401);

        // The URL parser normalizes `..` before routing, so the
        // forward target is always api.github.com.
        const path = c.req.path.replace(/^\/api\/github/, "");

        const contentLength = Number(c.req.header("content-length") ?? 0);
        if (contentLength > MAX_BODY_BYTES) {
            return c.json({ error: "request body too large" }, 413);
        }
        const body =
            c.req.method === "GET" || c.req.method === "HEAD"
                ? undefined
                : await c.req.text();
        if (body !== undefined && body.length > MAX_BODY_BYTES) {
            return c.json({ error: "request body too large" }, 413);
        }

        const response = await env.fetchFn(
            `https://api.github.com${path}${new URL(c.req.url).search}`,
            {
                method: c.req.method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github+json",
                    "Content-Type":
                        c.req.header("content-type") ?? "application/json",
                },
                body,
            },
        );
        return new Response(response.body, {
            status: response.status,
            headers: {
                "Content-Type":
                    response.headers.get("content-type") ?? "application/json",
            },
        });
    });

    return app;
}
