import { describe, expect, it } from "vitest";
import { authorFor, COMMITTER } from "./identity";
import {
    gitRemoteUrl,
    authFor,
    corsProxyFor,
    detectProvider,
    parseRepoUrl,
    RemoteConfigError,
} from "./remote-config";

describe("parseRepoUrl", () => {
    it.each([
        ["https://github.com/me/cv.git", "https://github.com/me/cv"],
        ["https://github.com/me/cv/", "https://github.com/me/cv"],
        ["  https://gitlab.com/g/sub/cv.git/ ", "https://gitlab.com/g/sub/cv"],
        [
            "https://git.example.com:8443/me/cv?x=1#y",
            "https://git.example.com:8443/me/cv",
        ],
    ])("normalizes %s", (input, url) => {
        expect(parseRepoUrl(input).url).toBe(url);
    });

    it("returns host and path", () => {
        expect(parseRepoUrl("https://gitlab.com/g/sub/cv.git")).toMatchObject({
            host: "gitlab.com",
            path: "g/sub/cv",
        });
    });

    it.each([
        ["", /required/],
        ["git@github.com:me/cv.git", /SSH/],
        ["ssh://git@github.com/me/cv.git", /SSH/],
        ["http://github.com/me/cv", /https/],
        ["https://user:pw@github.com/me/cv", /credentials/],
        ["https://tok@github.com/me/cv", /credentials/],
        ["https://github.com/me", /owner and repo/],
        ["not a url", /valid/],
    ])("rejects %j", (input, msg) => {
        expect(() => parseRepoUrl(input)).toThrow(RemoteConfigError);
        expect(() => parseRepoUrl(input)).toThrow(msg);
    });
});

describe("detectProvider", () => {
    it.each([
        ["github.com", "github"],
        ["gitlab.com", "gitlab"],
        ["gitlab.example.org", "gitlab"],
        ["bitbucket.org", "bitbucket"],
        ["codeberg.org", "forgejo"],
        ["forgejo.example.org", "forgejo"],
        ["gitea.com", "gitea"],
        ["gitea.me.io:3000", "gitea"],
        ["git.example.com", "generic"],
    ])("%s -> %s", (host, provider) => {
        expect(detectProvider(host)).toBe(provider);
    });
});

describe("gitRemoteUrl", () => {
    it("adds .git for GitLab only, so POSTs reach the git endpoint", () => {
        expect(gitRemoteUrl("https://gitlab.com/ada/cv", "gitlab")).toBe(
            "https://gitlab.com/ada/cv.git",
        );
        expect(gitRemoteUrl("https://gitlab.example.org/g/s/cv")).toBe(
            "https://gitlab.example.org/g/s/cv.git",
        );
        expect(gitRemoteUrl("https://gitlab.com/ada/cv.git", "gitlab")).toBe(
            "https://gitlab.com/ada/cv.git",
        );
        expect(gitRemoteUrl("https://github.com/ada/cv", "github")).toBe(
            "https://github.com/ada/cv",
        );
    });
});

describe("authFor", () => {
    const url = "https://git.example.com/me/cv";
    it.each([
        ["github", { username: "x-access-token", password: "T" }],
        ["gitlab", { username: "oauth2", password: "T" }],
        ["bitbucket", { username: "x-token-auth", password: "T" }],
        ["gitea", { username: "T", password: "x-oauth-basic" }],
        ["forgejo", { username: "T", password: "x-oauth-basic" }],
        ["generic", { username: "T", password: "x-oauth-basic" }],
    ] as const)("%s credentials", (provider, creds) => {
        expect(authFor({ url, token: "T", provider })).toEqual(creds);
    });

    it("detects the provider from the URL when omitted", () => {
        expect(
            authFor({ url: "https://gitlab.com/a/b", token: "T" }).username,
        ).toBe("oauth2");
    });
});

describe("misc", () => {
    it("builds the proxy URL", () => {
        expect(corsProxyFor("https://app.test/")).toBe(
            "https://app.test/api/git-proxy",
        );
    });

    it("falls back to a noreply author only for missing fields", () => {
        expect(authorFor()).toEqual({
            name: "CommitCV user",
            email: "noreply@commitcv.com",
        });
        expect(authorFor({ name: " Ada ", email: "" })).toEqual({
            name: "Ada",
            email: "noreply@commitcv.com",
        });
        expect(COMMITTER.email).toBe("commit@commitcv.com");
    });
});
