import { afterEach, describe, expect, it, vi } from "vitest";
import {
    ConflictError,
    GitAuthError,
    GitError,
    GitNetworkError,
    UnauthorizedError,
} from "../git/errors";
import { classifyGitError, classifyProvider, trackGit } from "./git.ts";
import { _resetAnalyticsForTesting } from "./tracker.ts";

describe("classifyProvider", () => {
    it.each([
        ["github.com", "github"],
        ["GitHub.com:443", "github"],
        ["gitlab.com", "gitlab"],
        ["codeberg.org", "codeberg"],
        ["gitlab.corp.example", "additional"],
        ["bitbucket.org", "additional"],
        ["gitea.example.org", "additional"],
        ["forgejo.example.org", "additional"],
        ["git.example.org", "additional"],
        ["", "additional"],
    ])("%s -> %s", (host, provider) => {
        expect(classifyProvider(host)).toEqual({ provider });
    });

    it("never echoes the host", () => {
        expect(
            JSON.stringify(classifyProvider("secret.corp.example")),
        ).not.toMatch(/secret|corp/);
    });
});

describe("classifyGitError", () => {
    const withStatus = (status: number) =>
        Object.assign(new GitError("x"), { statusCode: status });

    it.each([
        [new GitAuthError(), "auth"],
        [new UnauthorizedError(), "auth"],
        [new ConflictError(), "conflict"],
        [new GitNetworkError(), "network"],
        [withStatus(401), "auth"],
        [withStatus(404), "not_found"],
        [withStatus(429), "rate_limited"],
        [withStatus(502), "proxy"],
        [withStatus(504), "proxy"],
        [withStatus(500), "server"],
        [new TypeError("Failed to fetch"), "network"],
        [new Error("boom with repo ada/cv"), "unknown"],
        ["a string", "unknown"],
        [undefined, "unknown"],
    ])("%#", (err, expected) => {
        expect(classifyGitError(err)).toBe(expected);
    });
});

describe("trackGit", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        _resetAnalyticsForTesting();
    });

    it("sends the event through the sanitizer", () => {
        const track = vi.fn();
        vi.stubGlobal("window", { umami: { track } });
        trackGit("git connected", {
            provider: "github",
            method: "token",
            // @ts-expect-error not part of the schema
            repo: "ada/cv",
        });
        expect(track).toHaveBeenCalledWith("git connected", {
            provider: "github",
            method: "token",
        });
    });
});
