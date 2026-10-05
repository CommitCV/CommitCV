import type { IResume } from "@resume/resume";

export interface IResumeEntry {
    id: string;
    filename: string;
    date: string;
}

/**
 * A place resumes are stored. Implementations: browser localStorage
 * and a GitHub repository via the server proxy.
 */
export interface IResumeStorage {
    list(): Promise<IResumeEntry[]>;
    load(id: string): Promise<IResume>;
    save(id: string, resume: IResume, message?: string): Promise<void>;
    remove(id: string): Promise<void>;
}
