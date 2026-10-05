import { describe, expect, it, vi } from "vitest";
import type { IResume } from "@resume/resume";
import {
    ConflictError,
    GitHubResumeStorage,
    UnauthorizedError,
} from "./github-resume-storage";

function toBase64(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function response(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

const RESUME: IResume = {
    filename: "Resume1",
    date: "08-08-25",
    schema_version: 1,
    sections: [],
};

const RESUME_JSON = JSON.stringify(RESUME, null, 4);

function storageFor(fetchFn: unknown): GitHubResumeStorage {
    return new GitHubResumeStorage("travis/cv", fetchFn as typeof fetch);
}

describe("GitHubResumeStorage", () => {
    it("loads a file and decodes base64 as UTF-8", async () => {
        const fetchFn = vi.fn(async () =>
            response({
                name: "resume.json",
                type: "file",
                sha: "sha-1",
                content: toBase64(
                    JSON.stringify(
                        { ...RESUME, filename: "Résumé 🚀" },
                        null,
                        4,
                    ),
                ),
            }),
        );
        expect((await storageFor(fetchFn).load("resume.json")).filename).toBe(
            "Résumé 🚀",
        );
    });

    it("saves with the remembered sha and the commit message", async () => {
        const puts: { url: string; body: unknown }[] = [];
        const fetchFn = vi.fn(
            async (input: RequestInfo | URL, init?: RequestInit) => {
                if (init?.method === "PUT") {
                    puts.push({
                        url: String(input),
                        body: JSON.parse(String(init.body)),
                    });
                    return response({
                        name: "resume.json",
                        type: "file",
                        sha: "sha-2",
                    });
                }
                return response({
                    name: "resume.json",
                    type: "file",
                    sha: "sha-1",
                    content: toBase64(RESUME_JSON),
                });
            },
        );
        const storage = storageFor(fetchFn);

        await storage.load("resume.json");
        await storage.save("resume.json", RESUME, "my commit");

        expect(puts).toHaveLength(1);
        expect(puts[0]?.url).toBe(
            "/api/github/repos/travis/cv/contents/resume.json",
        );
        const body = puts[0]?.body as { sha: string; message: string };
        expect(body.sha).toBe("sha-1");
        expect(body.message).toBe("my commit");
    });

    it("rethrows a 409 as ConflictError", async () => {
        const fetchFn = vi.fn(async () =>
            response({ message: "conflict" }, 409),
        );
        await expect(storageFor(fetchFn).load("resume.json")).rejects.toThrow(
            ConflictError,
        );
    });

    it("rethrows a 401 as UnauthorizedError", async () => {
        const fetchFn = vi.fn(async () =>
            response({ message: "bad credentials" }, 401),
        );
        await expect(storageFor(fetchFn).load("resume.json")).rejects.toThrow(
            UnauthorizedError,
        );
    });

    it("lists only json files", async () => {
        const fetchFn = vi.fn(async () =>
            response([
                { name: "a.json", type: "file", sha: "s1" },
                { name: "readme.md", type: "file", sha: "s3" },
                { name: "sub", type: "dir", sha: "s4" },
            ]),
        );
        expect(await storageFor(fetchFn).list()).toEqual([
            { id: "a.json", filename: "a", date: "" },
        ]);
    });

    it("loads an older version at a ref", async () => {
        const urls: string[] = [];
        const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
            urls.push(String(input));
            return response({
                name: "resume.json",
                type: "file",
                sha: "old",
                content: toBase64(RESUME_JSON),
            });
        });
        await storageFor(fetchFn).loadAt("resume.json", "abc123");
        expect(urls[0]).toContain("ref=abc123");
    });

    it("encodes file names that contain url delimiters", async () => {
        const urls: string[] = [];
        const fetchFn = vi.fn(
            async (input: RequestInfo | URL, init?: RequestInit) => {
                urls.push(`${init?.method ?? "GET"} ${String(input)}`);
                return response({
                    name: "a#b?.json",
                    type: "file",
                    sha: "s",
                    content: toBase64(RESUME_JSON),
                });
            },
        );
        const storage = storageFor(fetchFn);
        await storage.load("a#b?.json");
        await storage.save("a#b?.json", RESUME);
        await storage.remove("a#b?.json");
        const encoded = "/api/github/repos/travis/cv/contents/a%23b%3F.json";
        expect(urls).toEqual([
            `GET ${encoded}`,
            `PUT ${encoded}`,
            `DELETE ${encoded}`,
        ]);
    });
});
