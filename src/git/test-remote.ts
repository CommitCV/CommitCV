/// <reference types="node" />
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
    GitHttpRequest,
    GitHttpResponse,
    HttpClient,
} from "isomorphic-git";

export const hasGit = (() => {
    try {
        execFileSync("git", ["--version"]);
        return true;
    } catch {
        return false;
    }
})();

// Hooks (husky/lint-staged) export GIT_DIR/GIT_INDEX_FILE; drop them so the
// fixture never touches the host repo.
const cleanEnv = () =>
    Object.fromEntries(
        Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")),
    );

const pkt = (s: string) => (s.length + 4).toString(16).padStart(4, "0") + s;

/** Seeds a bare repo (default branch main, one commit) in a tmp dir. */
export function makeBareRepo(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "commitcv-git-"));
    const bare = join(root, "remote.git");
    const work = join(root, "work");
    const run = (cwd: string, ...args: string[]) =>
        execFileSync("git", args, {
            cwd,
            stdio: "pipe",
            env: {
                ...cleanEnv(),
                GIT_AUTHOR_NAME: "Seed",
                GIT_AUTHOR_EMAIL: "seed@example.com",
                GIT_COMMITTER_NAME: "Seed",
                GIT_COMMITTER_EMAIL: "seed@example.com",
            },
        });
    run(root, "init", "--bare", "-b", "main", bare);
    run(root, "init", "-b", "main", work);
    for (const [name, content] of Object.entries(files)) {
        writeFileSync(join(work, name), content);
    }
    run(work, "add", ".");
    run(work, "commit", "-m", "seed");
    run(work, "push", bare, "main");
    return bare;
}

/**
 * isomorphic-git HttpClient that serves smart-HTTP by spawning
 * `git upload-pack` / `receive-pack --stateless-rpc` on a local bare repo.
 */
export function bareRepoHttp(bare: string, token?: string): HttpClient {
    return {
        async request({
            url,
            method = "GET",
            headers = {},
            body,
        }: GitHttpRequest) {
            const res = (
                statusCode: number,
                data: Uint8Array[],
                type = "text/plain",
            ): GitHttpResponse => ({
                url,
                method,
                statusCode,
                statusMessage: String(statusCode),
                headers: { "content-type": type },
                body: (async function* () {
                    yield* data;
                })(),
            });
            if (
                token &&
                (headers.Authorization ?? headers.authorization) !==
                    `Basic ${btoa(`${token}:x-oauth-basic`)}`
            ) {
                return res(401, []);
            }
            const u = new URL(url);
            const service = (
                u.searchParams.get("service") ?? u.pathname
            ).endsWith("receive-pack")
                ? "receive-pack"
                : "upload-pack";
            const args = [service, "--stateless-rpc"];
            if (method === "GET") args.push("--advertise-refs");
            args.push(bare);
            const child = spawn("git", args, {
                env: {
                    ...cleanEnv(),
                    GIT_PROTOCOL: headers["git-protocol"] ?? "",
                },
            });
            const out: Uint8Array[] = [];
            child.stdout.on("data", (d: Uint8Array) => out.push(d));
            child.stdin.on("error", () => {});
            if (body) for await (const chunk of body) child.stdin.write(chunk);
            child.stdin.end();
            await new Promise((r) => child.on("close", r));
            const type = `application/x-git-${service}-${method === "GET" ? "advertisement" : "result"}`;
            if (method === "GET") {
                out.unshift(
                    new TextEncoder().encode(
                        pkt(`# service=git-${service}\n`) + "0000",
                    ),
                );
            }
            return res(200, out, type);
        },
    };
}

export function gitIn(bare: string, ...args: string[]): string {
    return execFileSync("git", ["--git-dir", bare, ...args], {
        env: cleanEnv(),
    }).toString();
}
