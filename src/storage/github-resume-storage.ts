import type { IResume } from "@resume/resume";
import { parseResume } from "@resume/parse-resume";
import type { IResumeEntry, IResumeStorage } from "./resume-storage";

export class ConflictError extends Error {
    constructor() {
        super("This file changed on GitHub. Reload it before saving.");
        this.name = "ConflictError";
    }
}

export class UnauthorizedError extends Error {
    constructor() {
        super("GitHub sign-in expired. Sign in again.");
        this.name = "UnauthorizedError";
    }
}

interface IGitHubContent {
    name: string;
    type: string;
    sha: string;
    content?: string;
}

export interface IGitHubCommit {
    sha: string;
    html_url: string;
    commit: { message: string; author: { name: string; date: string } };
}

/**
 * Stores resumes as JSON files in one GitHub repository, through the
 * server's `/api/github` proxy. The sha of the last seen version is
 * kept per file, so saving over a changed remote fails with
 * `ConflictError` instead of silently overwriting it.
 * The `id` of a resume is its path in the repository.
 */
export class GitHubResumeStorage implements IResumeStorage {
    private readonly repo: string;
    private readonly fetchFn: typeof fetch;
    private readonly shas = new Map<string, string>();

    constructor(
        repo: string,
        fetchFn: typeof fetch = globalThis.fetch.bind(globalThis),
    ) {
        this.repo = repo;
        this.fetchFn = fetchFn;
    }

    async list(): Promise<IResumeEntry[]> {
        const files = await this.api<IGitHubContent[]>(
            `/repos/${this.repo}/contents`,
        );
        return files
            .filter(
                (file) => file.type === "file" && file.name.endsWith(".json"),
            )
            .map((file) => ({
                id: file.name,
                filename: file.name.replace(/\.json$/, ""),
                date: "",
            }));
    }

    async load(id: string): Promise<IResume> {
        return parseResume(
            JSON.parse(
                decodeBase64((await this.fetchContent(id)).content ?? ""),
            ),
        );
    }

    async save(
        id: string,
        resume: IResume,
        message = `update ${id}`,
    ): Promise<void> {
        const body: Record<string, unknown> = {
            message,
            content: encodeBase64(JSON.stringify(resume, null, 4)),
        };
        const sha = this.shas.get(id);
        if (sha) body.sha = sha;
        const file = await this.api<IGitHubContent>(this.contentsPath(id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        this.shas.set(id, file.sha);
    }

    async remove(id: string): Promise<void> {
        const sha = this.shas.get(id) ?? (await this.fetchContent(id)).sha;
        await this.api(this.contentsPath(id), {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: `delete ${id}`, sha }),
        });
        this.shas.delete(id);
    }

    async history(id: string): Promise<IGitHubCommit[]> {
        return this.api<IGitHubCommit[]>(
            `/repos/${this.repo}/commits?path=${encodeURIComponent(id)}&per_page=30`,
        );
    }

    async loadAt(id: string, ref: string): Promise<IResume> {
        const file = await this.api<IGitHubContent>(
            `${this.contentsPath(id)}?ref=${encodeURIComponent(ref)}`,
        );
        return parseResume(JSON.parse(decodeBase64(file.content ?? "")));
    }

    private contentsPath(id: string): string {
        const file = id.split("/").map(encodeURIComponent).join("/");
        return `/repos/${this.repo}/contents/${file}`;
    }

    private async fetchContent(id: string): Promise<IGitHubContent> {
        const file = await this.api<IGitHubContent>(this.contentsPath(id));
        this.shas.set(id, file.sha);
        return file;
    }

    private async api<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await this.fetchFn(`/api/github${path}`, init);
        if (response.status === 409) throw new ConflictError();
        if (response.status === 401) throw new UnauthorizedError();
        if (!response.ok)
            throw new Error(`GitHub API ${path} failed: ${response.status}`);
        return (await response.json()) as T;
    }
}

function decodeBase64(base64: string): string {
    return new TextDecoder().decode(
        Uint8Array.from(atob(base64.replace(/\s/g, "")), (c) =>
            c.charCodeAt(0),
        ),
    );
}

function encodeBase64(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}
