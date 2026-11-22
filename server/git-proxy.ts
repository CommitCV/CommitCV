import { Hono } from "hono";
import type { Context } from "hono";
import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";

export interface Address {
    address: string;
    family: number;
}

/** Sends the request to an already-validated address. */
export type Upstream = (
    url: URL,
    init: {
        method: string;
        headers: Record<string, string>;
        body?: ReadableStream<Uint8Array>;
        signal: AbortSignal;
        address: Address;
    },
) => Promise<Response>;

export interface GitProxyOptions {
    publicUrl: string;
    /** Empty means any public host. */
    allowedHosts?: string[];
    disabled?: boolean;
    resolve?: (host: string) => Promise<Address[]>;
    upstream?: Upstream;
    now?: () => number;
    maxBodyBytes?: number;
    rateLimitPerMinute?: number;
    /** Per-hop wait for upstream response headers. */
    timeoutMs?: number;
    /** Total time allowed for one request, body streaming included. */
    deadlineMs?: number;
    /** Most bytes relayed from upstream in one response. */
    maxResponseBytes?: number;
}

class ProxyError extends Error {
    status: 400 | 403 | 404 | 413 | 429 | 502 | 504;
    constructor(status: ProxyError["status"], message: string) {
        super(message);
        this.status = status;
    }
}

const MAX_HOPS = 3;
const PASS_REQUEST_HEADERS = [
    "authorization",
    "content-type",
    "accept",
    "accept-encoding",
    "git-protocol",
    "content-encoding",
];
const PASS_RESPONSE_HEADERS = [
    "content-type",
    "content-encoding",
    "content-length",
    "cache-control",
    "expires",
    "pragma",
    "etag",
    "www-authenticate",
];
const GIT_PATH =
    /^(?:\/[A-Za-z0-9._~-]+)+\/(info\/refs|git-upload-pack|git-receive-pack)$/;
const SERVICES = ["git-upload-pack", "git-receive-pack"];

// ── Address checks ─────────────────────────

function isPublicV4(address: string): boolean {
    const [a = 0, b = 0, c = 0] = address.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0 && c === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
}

/** Expands any textual IPv6 form into eight 16-bit groups. */
function parseV6(address: string): number[] {
    let text = address.split("%")[0] ?? "";
    const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(text)?.[1];
    if (tail) {
        const [a = 0, b = 0, c = 0, d = 0] = tail.split(".").map(Number);
        text =
            text.slice(0, -tail.length) +
            `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
    }
    const [head = "", rest] = text.split("::");
    const left = head ? head.split(":") : [];
    const right = rest ? rest.split(":") : [];
    const fill = rest === undefined ? 0 : 8 - left.length - right.length;
    return [...left, ...Array<string>(fill).fill("0"), ...right].map((g) =>
        parseInt(g, 16),
    );
}

export function isPublicAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 4) return isPublicV4(address);
    if (family !== 6) return false;
    const g = parseV6(address);
    const [g0 = 0, g1 = 0] = g;
    // IPv4-mapped (::ffff:a.b.c.d): judge the embedded IPv4 address.
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
        const v4 = [g[6] ?? 0, g[7] ?? 0].flatMap((x) => [x >> 8, x & 255]);
        return isPublicV4(v4.join("."));
    }
    // Only global unicast (2000::/3) minus 6to4, Teredo and documentation.
    if ((g0 & 0xe000) !== 0x2000) return false;
    if (g0 === 0x2002 || (g0 === 0x2001 && (g1 === 0 || g1 === 0xdb8))) {
        return false;
    }
    return true;
}

// ── Target validation ──────────────────────

/** Throws unless `url` is a public https git smart-HTTP endpoint. */
function checkUrl(url: URL, method: string, allowed: string[]): void {
    const host = url.hostname;
    if (url.protocol !== "https:") throw new ProxyError(403, "https only");
    if (url.username || url.password || url.port) {
        throw new ProxyError(403, "userinfo and ports are not allowed");
    }
    // Letters-only TLD rules out IP literals, including odd numeric forms.
    if (
        !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z][a-z0-9-]*$/.test(host) ||
        host.endsWith(".local") ||
        host.endsWith(".internal") ||
        host.endsWith(".localhost")
    ) {
        throw new ProxyError(403, "host is not allowed");
    }
    if (allowed.length > 0 && !allowed.includes(host)) {
        throw new ProxyError(403, "host is not on the allowlist");
    }
    const endpoint = GIT_PATH.exec(url.pathname)?.[1];
    if (!endpoint) throw new ProxyError(404, "not a git endpoint");
    const service = url.searchParams.get("service");
    if (endpoint === "info/refs") {
        const ok =
            method === "GET" &&
            [...url.searchParams.keys()].join() === "service" &&
            SERVICES.includes(service ?? "");
        if (!ok) throw new ProxyError(404, "not a git endpoint");
    } else if (method !== "POST" || url.search) {
        throw new ProxyError(404, "not a git endpoint");
    }
}

// ── Response guard ─────────────────────────

/**
 * Relays `body` but errors it once it passes `maxBytes` or the `deadline`
 * signal aborts, whichever the upstream does or doesn't cooperate with.
 * `done` runs once when the stream ends, fails or is cancelled.
 */
function guardBody(
    body: ReadableStream<Uint8Array>,
    maxBytes: number,
    deadline: AbortSignal,
    done: () => void,
): ReadableStream<Uint8Array> {
    const reader = body.getReader();
    let total = 0;
    const expired = new Promise<never>((_resolve, reject) => {
        deadline.addEventListener(
            "abort",
            () => reject(new Error("upstream deadline exceeded")),
            { once: true },
        );
    });
    expired.catch(() => {});
    return new ReadableStream<Uint8Array>({
        async pull(controller) {
            try {
                const { done: finished, value } = await Promise.race([
                    reader.read(),
                    expired,
                ]);
                if (finished) {
                    done();
                    return controller.close();
                }
                total += value.byteLength;
                if (total > maxBytes) throw new Error("response too large");
                controller.enqueue(value);
            } catch (error) {
                reader.cancel().catch(() => {});
                done();
                controller.error(error);
            }
        },
        cancel(reason) {
            done();
            return reader.cancel(reason);
        },
    });
}

// ── Upstream (production) ──────────────────

const NULL_BODY = new Set([101, 204, 205, 304]);

/** Connects to the pinned address only, so DNS is never resolved twice. */
const nodeUpstream: Upstream = (url, init) =>
    new Promise((resolve, reject) => {
        const req = httpsRequest(
            url,
            {
                method: init.method,
                headers: init.headers,
                signal: init.signal,
                lookup: (_host, options, callback) => {
                    const { address, family } = init.address;
                    // Node >= 20 may ask for every address at once.
                    if (options.all) {
                        callback(null, [{ address, family }]);
                    } else {
                        callback(null, address, family);
                    }
                },
            },
            (res) => {
                const headers = new Headers();
                for (const [name, value] of Object.entries(res.headers)) {
                    if (typeof value === "string") headers.set(name, value);
                }
                const status = res.statusCode ?? 502;
                if (NULL_BODY.has(status)) res.resume();
                resolve(
                    new Response(
                        NULL_BODY.has(status)
                            ? null
                            : (Readable.toWeb(res) as ReadableStream),
                        { status, headers },
                    ),
                );
            },
        );
        req.on("error", reject);
        if (init.body) {
            Readable.fromWeb(init.body as never)
                .on("error", (error) => req.destroy(error))
                .pipe(req);
        } else {
            req.end();
        }
    });

async function defaultResolve(host: string): Promise<Address[]> {
    return lookup(host, { all: true });
}

// ── Proxy ──────────────────────────────────

/**
 * CORS proxy for git smart-HTTP, shaped for isomorphic-git's
 * `corsProxy` option: `/<host>/<repo path>/<git endpoint>`. Tokens
 * arrive in the client's Authorization header and are only forwarded;
 * nothing about a request is stored or logged beyond method/host/status.
 */
export function gitProxy(options: GitProxyOptions): Hono {
    const app = new Hono();
    const resolve = options.resolve ?? defaultResolve;
    const upstream = options.upstream ?? nodeUpstream;
    const now = options.now ?? Date.now;
    const maxBody = options.maxBodyBytes ?? 10_000_000;
    const limit = options.rateLimitPerMinute ?? 120;
    const timeoutMs = options.timeoutMs ?? 60_000;
    const deadlineMs = options.deadlineMs ?? 300_000;
    const maxResponse = options.maxResponseBytes ?? 100_000_000;
    const allowedHosts = (options.allowedHosts ?? []).map((h) =>
        h.trim().toLowerCase(),
    );
    const publicOrigin = new URL(options.publicUrl).origin;
    const hits = new Map<string, { count: number; resetAt: number }>();

    function rateLimited(c: Context): boolean {
        // The last entry is the one our nearest proxy appended.
        const ip =
            c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim() ??
            "unknown";
        const time = now();
        if (hits.size > 10_000) {
            for (const [key, hit] of hits) {
                if (hit.resetAt <= time) hits.delete(key);
            }
        }
        let hit = hits.get(ip);
        if (!hit || hit.resetAt <= time) {
            hit = { count: 0, resetAt: time + 60_000 };
            hits.set(ip, hit);
        }
        return ++hit.count > limit;
    }

    async function pickAddress(host: string): Promise<Address> {
        let addresses: Address[];
        try {
            addresses = await resolve(host);
        } catch {
            throw new ProxyError(502, "could not resolve host");
        }
        if (addresses.length === 0) {
            throw new ProxyError(502, "could not resolve host");
        }
        // One private answer taints the host: no rebinding by mixing.
        if (!addresses.every((a) => isPublicAddress(a.address))) {
            throw new ProxyError(403, "host resolves to a private address");
        }
        return addresses[0] as Address;
    }

    function corsHeaders(c: Context): Record<string, string> {
        const origin = c.req.header("origin");
        return {
            "Access-Control-Allow-Origin": origin ?? "",
            "Access-Control-Expose-Headers":
                "content-type, git-protocol, www-authenticate",
            Vary: "Origin",
        };
    }

    function originAllowed(c: Context): boolean {
        const origin = c.req.header("origin");
        if (!origin) return true; // non-browser client
        try {
            return (
                origin === publicOrigin ||
                new URL(origin).host === c.req.header("host")
            );
        } catch {
            return false;
        }
    }

    app.all("/*", async (c) => {
        const fail = (status: ProxyError["status"], message: string) =>
            c.json({ error: message }, status);
        if (options.disabled) return fail(403, "git proxy is disabled");
        if (!originAllowed(c)) return fail(403, "origin is not allowed");
        const cors = c.req.header("origin") ? corsHeaders(c) : {};

        if (c.req.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    ...cors,
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers":
                        PASS_REQUEST_HEADERS.join(", "),
                    "Access-Control-Max-Age": "600",
                },
            });
        }

        let host = "";
        const deadline = new AbortController();
        const deadlineTimer = setTimeout(() => deadline.abort(), deadlineMs);
        let handedOff = false;
        try {
            if (c.req.method !== "GET" && c.req.method !== "POST") {
                throw new ProxyError(403, "method not allowed");
            }
            if (rateLimited(c)) throw new ProxyError(429, "rate limited");

            const inbound = new URL(c.req.url);
            const rest = inbound.pathname.replace(/^\/api\/git-proxy\//, "");
            const slash = rest.indexOf("/");
            if (slash < 1) throw new ProxyError(404, "not a git endpoint");
            let target: URL;
            try {
                target = new URL(
                    `https://${rest.slice(0, slash)}${rest.slice(slash)}${inbound.search}`,
                );
            } catch {
                throw new ProxyError(400, "invalid host");
            }
            checkUrl(target, c.req.method, allowedHosts);

            const headers: Record<string, string> = {
                "user-agent": "commitcv-git-proxy",
            };
            for (const name of PASS_REQUEST_HEADERS) {
                const value = c.req.header(name);
                if (value) headers[name] = value;
            }

            const declared = Number(c.req.header("content-length") ?? 0);
            if (declared > maxBody) {
                throw new ProxyError(413, "request body too large");
            }
            let received = 0;
            let tooLarge = false;
            const body = c.req.raw.body?.pipeThrough(
                new TransformStream<Uint8Array, Uint8Array>({
                    transform(chunk, controller) {
                        received += chunk.byteLength;
                        if (received > maxBody) {
                            tooLarge = true;
                            controller.error(new Error("too large"));
                        } else {
                            controller.enqueue(chunk);
                        }
                    },
                }),
            );

            for (let hop = 0; ; hop++) {
                host = target.hostname;
                const address = await pickAddress(host);
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                const signal = AbortSignal.any([
                    controller.signal,
                    deadline.signal,
                ]);
                let response: Response;
                try {
                    response = await upstream(target, {
                        method: c.req.method,
                        headers,
                        body: hop === 0 ? body : undefined,
                        signal,
                        address,
                    });
                } catch {
                    if (tooLarge) {
                        throw new ProxyError(413, "request body too large");
                    }
                    throw signal.aborted
                        ? new ProxyError(504, "upstream timed out")
                        : new ProxyError(502, "upstream request failed");
                } finally {
                    clearTimeout(timer);
                }

                if (response.status >= 300 && response.status < 400) {
                    await response.body?.cancel();
                    const location = response.headers.get("location");
                    // A POST body cannot be replayed, so only GETs follow.
                    if (
                        !location ||
                        c.req.method !== "GET" ||
                        hop >= MAX_HOPS
                    ) {
                        throw new ProxyError(502, "unsupported redirect");
                    }
                    let next: URL;
                    try {
                        next = new URL(location, target);
                    } catch {
                        throw new ProxyError(502, "invalid redirect");
                    }
                    checkUrl(next, "GET", allowedHosts);
                    if (next.hostname !== target.hostname) {
                        delete headers.authorization; // never leak the token
                    }
                    target = next;
                    continue;
                }

                if (response.status >= 400) {
                    // Status and a short body only; never request headers.
                    const detail = await response
                        .clone()
                        .text()
                        .then((t) => t.slice(0, 200).replace(/\s+/g, " "))
                        .catch(() => "");
                    console.warn(
                        `git-proxy: ${target.hostname}${target.pathname} -> ${response.status} ${detail}`,
                    );
                }
                const out = new Headers(cors);
                for (const name of PASS_RESPONSE_HEADERS) {
                    const value = response.headers.get(name);
                    if (value) out.set(name, value);
                }
                const declared = Number(response.headers.get("content-length"));
                if (declared > maxResponse) {
                    await response.body?.cancel();
                    throw new ProxyError(502, "upstream response too large");
                }
                handedOff = response.body !== null;
                return new Response(
                    response.body &&
                        guardBody(
                            response.body,
                            maxResponse,
                            deadline.signal,
                            () => clearTimeout(deadlineTimer),
                        ),
                    { status: response.status, headers: out },
                );
            }
        } catch (error) {
            if (!(error instanceof ProxyError)) throw error;
            if (error.status >= 500) {
                console.warn(
                    `git-proxy ${c.req.method} ${host} ${error.status}`,
                );
            }
            return new Response(JSON.stringify({ error: error.message }), {
                status: error.status,
                headers: { ...cors, "content-type": "application/json" },
            });
        } finally {
            if (!handedOff) clearTimeout(deadlineTimer);
        }
    });

    return app;
}
