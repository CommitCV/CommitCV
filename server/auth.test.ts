import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";

const env = {
    githubClientId: "cid",
    githubClientSecret: "secret",
    publicUrl: "http://localhost:8787",
};

function app(fetchFn: typeof fetch) {
    return createApp({ env, distDir: "./server/test-dist", fetchFn });
}

const quietFetch: typeof fetch = async () => new Response("{}");

const tokenFetch: typeof fetch = async (input) => {
    if (String(input).includes("access_token")) {
        return Response.json({ access_token: "tok" });
    }
    if (String(input).includes("api.github.com/user")) {
        return Response.json({ login: "octocat" });
    }
    return Response.json({});
};

describe("github auth", () => {
    it("login redirects to github with a state cookie", async () => {
        const response = await app(quietFetch).request("/api/auth/login");
        expect(response.status).toBe(302);
        const location = response.headers.get("location") ?? "";
        expect(location).toContain(
            "https://github.com/login/oauth/authorize?client_id=cid",
        );
        expect(location).toContain("state=");
        expect(response.headers.get("set-cookie")).toContain("gh_state=");
    });

    it("callback rejects a missing or mismatched state", async () => {
        const noCookie = await app(quietFetch).request(
            "/api/auth/callback?code=c&state=x",
        );
        expect(noCookie.status).toBe(400);
        expect(noCookie.headers.get("set-cookie") ?? "").not.toContain(
            "gh_token",
        );

        const wrongCookie = await app(quietFetch).request(
            "/api/auth/callback?code=c&state=y",
            {
                headers: { cookie: "gh_state=not-y" },
            },
        );
        expect(wrongCookie.status).toBe(400);
        expect(wrongCookie.headers.get("set-cookie") ?? "").not.toContain(
            "gh_token",
        );
    });

    it("callback with a matching state sets an httpOnly cookie and redirects home", async () => {
        const login = await app(quietFetch).request("/api/auth/login");
        const state = new URL(
            login.headers.get("location") ?? "",
        ).searchParams.get("state");
        const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

        const response = await app(tokenFetch).request(
            `/api/auth/callback?code=abc&state=${state}`,
            { headers: { cookie } },
        );
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/");
        const setCookie = response.headers.get("set-cookie") ?? "";
        expect(setCookie).toContain("gh_token=tok");
        expect(setCookie).toContain("HttpOnly");
        expect(setCookie).toContain("Secure");
        expect(setCookie).toContain("SameSite=Lax");
    });

    it("returns 502 when the code exchange fails", async () => {
        const login = await app(quietFetch).request("/api/auth/login");
        const state = new URL(
            login.headers.get("location") ?? "",
        ).searchParams.get("state");
        const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
        const failingFetch: typeof fetch = async () =>
            Response.json({ error: "bad_code" });

        const response = await app(failingFetch).request(
            `/api/auth/callback?code=bad&state=${state}`,
            { headers: { cookie } },
        );
        expect(response.status).toBe(502);
    });

    it("logout clears the token cookie", async () => {
        const response = await app(quietFetch).request("/api/auth/logout", {
            method: "POST",
            headers: { cookie: "gh_token=x" },
        });
        expect(response.headers.get("set-cookie")).toContain("gh_token=");
    });

    it("session reports the signed-in login", async () => {
        const response = await app(tokenFetch).request("/api/auth/session", {
            headers: { cookie: "gh_token=tok" },
        });
        expect(await response.json()).toEqual({
            authenticated: true,
            login: "octocat",
        });
    });

    it("session reports signed out without a cookie", async () => {
        const response = await app(quietFetch).request("/api/auth/session");
        expect(await response.json()).toEqual({ authenticated: false });
    });
});
