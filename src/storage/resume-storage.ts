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
