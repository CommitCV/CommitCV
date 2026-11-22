import type { MiddlewareHandler } from "hono";

/** The origin of a URL, or undefined when it is empty or not a URL. */
function originOf(url: string | undefined): string | undefined {
    try {
        return url ? new URL(url).origin : undefined;
    } catch {
        return undefined;
    }
}

/**
 * The Content-Security-Policy for HTML responses. Tokens live in IndexedDB,
 * readable by any script on the origin, so only our own code and the
 * configured Umami host may run. `wasm-unsafe-eval` is for the Typst compiler.
 */
export function contentSecurityPolicy(umamiUrl?: string): string {
    const umami = originOf(umamiUrl);
    const withUmami = (...sources: string[]) =>
        [...sources, ...(umami ? [umami] : [])].join(" ");
    return [
        "default-src 'self'",
        `script-src ${withUmami("'self'", "'wasm-unsafe-eval'")}`,
        `connect-src ${withUmami("'self'")}`,
        "worker-src 'self' blob:",
        "img-src 'self' blob: data:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
        "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
    ].join("; ");
}

/** Sets the CSP on every HTML response (the SPA shell and its fallback). */
export function cspMiddleware(umamiUrl?: string): MiddlewareHandler {
    const policy = contentSecurityPolicy(umamiUrl);
    return async (c, next) => {
        await next();
        if (c.res.headers.get("content-type")?.includes("text/html")) {
            c.res.headers.set("Content-Security-Policy", policy);
        }
    };
}
