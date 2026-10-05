import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";

const env = {
    githubClientId: "cid",
    githubClientSecret: "secret",
    publicUrl: "http://localhost:8787",
};

function app() {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchFn: typeof fetch = async (input, init) => {
        calls.push({ url: String(input), init });
        return Response.json({ ok: true });
    };
    return {
        calls,
        server: createApp({ env, distDir: "./server/test-dist", fetchFn }),
    };
}

describe("github api proxy", () => {
    it("forwards to api.github.com with the bearer token and query", async () => {
        const { server, calls } = app();
        const response = await server.request(
            "/api/github/repos/travis/cv/contents?ref=abc",
            {
                headers: { cookie: "gh_token=tok" },
            },
        );
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
        expect(calls[0]?.url).toBe(
            "https://api.github.com/repos/travis/cv/contents?ref=abc",
        );
        expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBe(
            "Bearer tok",
        );
    });

    it("requires sign in", async () => {
        const response = await app().server.request(
            "/api/github/repos/travis/cv/contents",
        );
        expect(response.status).toBe(401);
    });

    it("cannot escape the github prefix", async () => {
        const { calls, server } = app();
        const response = await server.request("/api/github/%2e%2e/evil", {
            headers: { cookie: "gh_token=tok" },
        });
        expect(response.status).toBe(404);
        expect(calls).toHaveLength(0);
    });

    it("caps the request body at 1MB", async () => {
        const response = await app().server.request(
            "/api/github/repos/travis/cv/contents/resume.json",
            {
                method: "PUT",
                headers: {
                    cookie: "gh_token=tok",
                    "Content-Type": "application/json",
                },
                body: "a".repeat(1_000_001),
            },
        );
        expect(response.status).toBe(413);
    });

    it("forwards methods and bodies", async () => {
        const { server, calls } = app();
        const response = await server.request(
            "/api/github/repos/travis/cv/contents/resume.json",
            {
                method: "PUT",
                headers: {
                    cookie: "gh_token=tok",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: "update" }),
            },
        );
        expect(response.status).toBe(200);
        expect(calls[0]?.init?.method).toBe("PUT");
        expect(String(calls[0]?.init?.body)).toContain("update");
    });
});
