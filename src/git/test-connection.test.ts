import { describe, expect, it } from "vitest";
import { GitAuthError, GitNetworkError } from "./errors";
import { describeConnectError } from "./test-connection";

describe("describeConnectError", () => {
    it("explains auth failures", () => {
        expect(describeConnectError(new GitAuthError(), "tok")).toMatch(
            /Authentication failed/,
        );
    });

    it("explains network failures and scrubs the token", () => {
        const msg = describeConnectError(
            new GitNetworkError("Network error: boom tok-123"),
            "tok-123",
        );
        expect(msg).toMatch(/Could not reach/);
        expect(msg).not.toContain("tok-123");
    });

    it("scrubs the token from other errors", () => {
        const msg = describeConnectError(new Error("bad tok-123"), "tok-123");
        expect(msg).toBe("bad ***");
    });
});
