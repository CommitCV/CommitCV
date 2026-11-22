import type { IResume } from "@resume/resume";
import type { IThumbnail } from "@storage/idb-resume-storage";

export interface IThumbnailDeps {
    cache: {
        loadThumbnail(id: string): Promise<IThumbnail | undefined>;
        saveThumbnail(id: string, hash: string, blob: Blob): Promise<void>;
    };
    /** Renders a resume's first page to an image. */
    render(resume: IResume): Promise<Blob>;
}

/** SHA-256 of the resume JSON, hex; changes exactly when the content does. */
export async function hashResume(resume: IResume): Promise<string> {
    const bytes = new TextEncoder().encode(JSON.stringify(resume));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
    ).join("");
}

export function createThumbnailService({ cache, render }: IThumbnailDeps) {
    // Latest queued job per id. A request for different content waits for
    // the one in flight, so the cache always ends with the newest resume.
    const pending = new Map<
        string,
        { content: string; job: Promise<Blob | undefined> }
    >();

    async function generate(id: string, resume: IResume) {
        try {
            const hash = await hashResume(resume);
            const cached = await cache.loadThumbnail(id);
            if (cached?.hash === hash) return cached.blob;
            const blob = await render(resume);
            await cache.saveThumbnail(id, hash, blob);
            return blob;
        } catch {
            return undefined;
        }
    }

    /** The cached thumbnail, rendered first if stale. Never rejects. */
    function ensureThumbnail(
        id: string,
        resume: IResume,
    ): Promise<Blob | undefined> {
        const content = JSON.stringify(resume);
        const last = pending.get(id);
        if (last?.content === content) return last.job;
        const job: Promise<Blob | undefined> = (last?.job ?? Promise.resolve())
            .then(() => generate(id, resume))
            .finally(() => {
                if (pending.get(id)?.job === job) pending.delete(id);
            });
        pending.set(id, { content, job });
        return job;
    }

    return { ensureThumbnail };
}
