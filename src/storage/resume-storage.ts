import type { IResume } from "@resume/resume";

export interface IResumeEntry {
    id: string;
    filename: string;
    date: string;
    /** When it was last saved (ms since epoch), if the store records it. */
    updatedAt?: number;
}

/**
 * Where resumes live. Each resume is addressed by an opaque id chosen by
 * the store. `list` returns entries without loading content, `load`
 * rejects when the id is unknown, and `save` replaces the resume under
 * an id (the optional message describes the change for stores that keep
 * history). `remove` deletes it. Stores may be local or remote, so every
 * method is async and may reject.
 */
export interface IResumeStorage {
    list(): Promise<IResumeEntry[]>;
    load(id: string): Promise<IResume>;
    save(id: string, resume: IResume, message?: string): Promise<void>;
    remove(id: string): Promise<void>;
}

/** One restore point: a commit on the default branch that changed a file. */
export interface IHistoryEntry {
    sha: string;
    /** First line of the commit message. */
    message: string;
    body?: string;
    /** ms since epoch. */
    date: number;
    author: string;
}

export interface IHistoryPage {
    entries: IHistoryEntry[];
    /** Older restore points exist (possibly not fetched yet). */
    hasMore: boolean;
}

/** Storage that can show and load earlier versions of a resume. */
export interface IVersionedStorage extends IResumeStorage {
    /** Newest first; pass the oldest sha you have as `before` to page. */
    history(
        id: string,
        opts: { limit: number; before?: string },
    ): Promise<IHistoryPage>;
    loadAt(id: string, sha: string): Promise<IResume>;
}
