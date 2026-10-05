import { afterEach, describe, expect, it, vi } from "vitest";
import type { IResume } from "@resume/resume";
import { standaloneTypst } from "./standalone-typst";

afterEach(() => {
    vi.unstubAllGlobals();
});

const RESUME: IResume = {
    filename: "x",
    date: "01-01-26",
    schema_version: 1,
    sections: [],
};

describe("standaloneTypst", () => {
    it("fails instead of inlining an error page when an asset is missing", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("Not found", { status: 404 })),
        );
        await expect(standaloneTypst(RESUME)).rejects.toThrow(/failed to load/);
    });
});
