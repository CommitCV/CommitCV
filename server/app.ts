import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { githubApi } from "./github.ts";
import type { ServerEnv } from "./github.ts";

const here = dirname(fileURLToPath(import.meta.url));

export interface CreateAppOptions {
    env?: Partial<ServerEnv>;
    distDir?: string;
    fetchFn?: typeof fetch;
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
    app.route("/api", githubApi(env));

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
