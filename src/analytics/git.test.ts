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
        ["github.com", "github", "public"],
        ["GitHub.com:443", "github", "public"],
        ["gitlab.com", "gitlab", "public"],
        ["bitbucket.org", "bitbucket", "public"],
        ["codeberg.org", "codeberg", "public"],
        ["gitlab.corp.example", "gitlab", "self_hosted"],
        ["gitea.example.org", "gitea", "self_hosted"],
        ["forgejo.example.org", "forgejo", "self_hosted"],
        ["git.example.org", "other", "self_hosted"],
    ])("%s -> %s, %s", (host, provider, hostKind) => {
        expect(classifyProvider(host)).toEqual({
            provider,
            host_kind: hostKind,
        });
    });

    it("trusts a known provider over a custom hostname", () => {
        expect(classifyProvider("git.example.org", "gitlab")).toEqual({
            provider: "gitlab",
            host_kind: "self_hosted",
        });
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
            host_kind: "public",
            method: "token",
            // @ts-expect-error not part of the schema
            repo: "ada/cv",
        });
        expect(track).toHaveBeenCalledWith("git connected", {
            provider: "github",
            host_kind: "public",
            method: "token",
        });
    });
});
