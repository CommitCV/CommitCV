import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gitProxy } from "./git-proxy.ts";
import type { GitProxyOptions } from "./git-proxy.ts";
import { cspMiddleware } from "./csp.ts";
import { githubApi } from "./github.ts";
import type { ServerEnv } from "./github.ts";
import { oauthApi } from "./oauth.ts";
import type { OAuthOptions } from "./oauth.ts";
import { loadOAuthApps } from "./oauth-providers.ts";
import { randomBytes } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));

/** `{ [key]: n }` for a positive number in `process.env[name]`, else `{}`. */
function numberFromEnv<K extends "deadlineMs" | "maxResponseBytes">(
    key: K,
    name: string,
): Partial<Record<K, number>> {
    const value = Number(process.env[name]);
    return value > 0 ? ({ [key]: value } as Record<K, number>) : {};
}

export interface CreateAppOptions {
    env?: Partial<ServerEnv>;
    distDir?: string;
    fetchFn?: typeof fetch;
    gitProxy?: Partial<GitProxyOptions>;
    oauth?: Partial<OAuthOptions>;
}

/**
 * The whole CommitCV server: the GitHub auth + proxy API under
 * `/api`, the built frontend from `dist/`, and an SPA fallback.
 */
export function createApp(options: CreateAppOptions = {}): Hono {
    const env: ServerEnv = {
        githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
        githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        publicUrl: (process.env.PUBLIC_URL ?? "http://localhost:8787").replace(
            /\/$/,
            "",
        ),
        fetchFn: globalThis.fetch,
        ...options.env,
    };
    if (options.fetchFn) env.fetchFn = options.fetchFn;

    const app = new Hono();
    app.use(
        "*",
        cspMiddleware(process.env.VITE_UMAMI_URL || process.env.UMAMI_URL),
    );
    app.route("/api", githubApi(env));
    // Production without SESSION_SECRET offers no sign-in at all; dev
    // falls back to a per-process key.
    const sessionSecret =
        process.env.SESSION_SECRET ||
        (process.env.NODE_ENV === "production"
            ? ""
            : randomBytes(32).toString("hex"));
    app.route(
        "/api/oauth",
        oauthApi({
            publicUrl: env.publicUrl,
            fetchFn: env.fetchFn,
            sessionSecret,
            githubAppSlug: process.env.GITHUB_APP_SLUG,
            apps: loadOAuthApps(process.env, {
                clientId: env.githubClientId,
                clientSecret: env.githubClientSecret,
            }),
            ...options.oauth,
        }),
    );
    app.route(
        "/api/git-proxy",
        gitProxy({
            publicUrl: env.publicUrl,
            allowedHosts: (process.env.GIT_PROXY_ALLOWED_HOSTS ?? "")
                .split(",")
                .filter((h) => h.trim()),
            disabled: process.env.GIT_PROXY_DISABLED === "1",
            ...numberFromEnv("deadlineMs", "GIT_PROXY_DEADLINE_MS"),
            ...numberFromEnv(
                "maxResponseBytes",
                "GIT_PROXY_MAX_RESPONSE_BYTES",
            ),
            ...options.gitProxy,
        }),
    );

    const distDir = options.distDir ?? join(here, "..", "dist");
    const root = relative(process.cwd(), distDir) || ".";

    app.use("/*", serveStatic({ root }));
    app.get("*", async (c) => {
        // Assets and API misses must not fall back to the SPA.
        if (
            c.req.path.startsWith("/assets/") ||
            c.req.path.startsWith("/api/")
        ) {
            return c.notFound();
        }
        return c.html(await readFile(join(distDir, "index.html"), "utf8"));
    });

    return app;
}
