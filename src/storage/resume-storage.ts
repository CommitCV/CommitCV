import type { IResume } from "@resume/resume";

export interface IResumeEntry {
    id: string;
    filename: string;
    date: string;
    /** When it was last saved (ms since epoch), if the store records it. */
    updatedAt?: number;
}

/**
 * A place resumes are stored. Implementations: browser IndexedDB
 * (migrating the old localStorage entries) and a GitHub repository
 * via the server proxy.
 */
export interface IResumeStorage {
    list(): Promise<IResumeEntry[]>;
    load(id: string): Promise<IResume>;
    save(id: string, resume: IResume, message?: string): Promise<void>;
    remove(id: string): Promise<void>;
}
