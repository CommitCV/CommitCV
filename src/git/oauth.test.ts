import { afterEach, describe, expect, it, vi } from "vitest";
import type { IConnection } from "./connections";
import { connections } from "./connections";
import {
    connectionFromHandoff,
    freshConnection,
    loginUrl,
    signinErrorMessage,
    type Handoff,
} from "./oauth";

vi.mock("./connections", () => ({ connections: { update: vi.fn() } }));

const handoff: Handoff = {
    provider: "forgejo",
    host: "codeberg.org",
    accessToken: "tok",
    refreshToken: "ref",
    expiresAt: 5,
    user: { name: "Ada", login: "ada" },
};

describe("oauth helpers", () => {
    it("builds a login url and readable errors", () => {
        expect(loginUrl("forgejo", "codeberg.org")).toBe(
            "/api/oauth/login?provider=forgejo&host=codeberg.org&return=%2Fconnect",
        );
        expect(signinErrorMessage("denied")).toMatch(/cancelled/);
        expect(signinErrorMessage("???")).toMatch(/failed/);
    });

    it("maps a handoff to a connection with refresh data", () => {
        const c = connectionFromHandoff(
            handoff,
            { url: "https://codeberg.org/ada/cv", path: "ada/cv" },
            { name: "Ada", email: "a@x.io" },
        );
        expect(c).toMatchObject({
            provider: "forgejo",
            label: "ada@codeberg.org",
            token: "tok",
            oauth: { host: "codeberg.org", refreshToken: "ref", expiresAt: 5 },
        });
        const plain = connectionFromHandoff(
            { ...handoff, refreshToken: undefined, expiresAt: undefined },
            { url: "u", path: "p" },
            { name: "Ada", email: "a@x.io" },
        );
        expect(plain.oauth).toBeUndefined();
    });
});

describe("freshConnection", () => {
    afterEach(() => vi.unstubAllGlobals());
    const conn = (expiresAt: number): IConnection => ({
        id: "1",
        url: "https://codeberg.org/ada/cv",
        provider: "forgejo",
        label: "l",
        token: "old",
        author: { name: "a", email: "e" },
        oauth: { host: "codeberg.org", refreshToken: "ref", expiresAt },
    });

    it("leaves non-expiring and still-valid tokens alone", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const plain = { ...conn(0), oauth: undefined };
        expect(await freshConnection(plain, 1000)).toBe(plain);
        const valid = conn(1_000_000);
        expect(await freshConnection(valid, 1000)).toBe(valid);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("keeps the old token when the refresh fails", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => Response.json({ error: "x" }, { status: 401 })),
        );
        const expired = conn(10);
        expect(await freshConnection(expired, 1_000_000)).toBe(expired);
    });

    it("swaps in the refreshed token and persists it", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                Response.json({
                    accessToken: "new",
                    refreshToken: "ref2",
                    expiresAt: 9_999_999,
                }),
            ),
        );
        const next = await freshConnection(conn(10), 1_000_000);
        expect(next.token).toBe("new");
        expect(next.oauth).toEqual({
            host: "codeberg.org",
            refreshToken: "ref2",
            expiresAt: 9_999_999,
        });
        expect(connections.update).toHaveBeenCalledWith(next);
    });
});
