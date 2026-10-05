import { afterEach, describe, expect, it, vi } from "vitest";
import { TypstCompiler } from "./typst-compiler";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("TypstCompiler.init", () => {
    it("retries after a failed init instead of caching the rejection", async () => {
        const fetchFn = vi.fn(async () => new Response("", { status: 500 }));
        vi.stubGlobal("fetch", fetchFn);
        const compiler = new TypstCompiler();

        await expect(compiler.init()).rejects.toThrow(/failed to load/);
        const callsAfterFirst = fetchFn.mock.calls.length;
        await expect(compiler.init()).rejects.toThrow(/failed to load/);

        expect(fetchFn.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });
});
