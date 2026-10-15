import type { IResume } from "@resume/resume";
import { parseResume, ResumeParseError } from "@resume/parse-resume";
import type { IResumeEntry, IResumeStorage } from "./resume-storage";

const PREFIX = "commitcv:resume:";

type BrowserStorage = Pick<
    Storage,
    "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

export class LocalResumeStorage implements IResumeStorage {
    private readonly storage: BrowserStorage;

    constructor(storage: BrowserStorage = localStorage) {
        this.storage = storage;
    }

    async list(): Promise<IResumeEntry[]> {
        const entries: IResumeEntry[] = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (!key?.startsWith(PREFIX)) continue;
            const entry = this.peek(key);
            if (entry) entries.push(entry);
        }
        return entries;
    }

    async load(id: string): Promise<IResume> {
        const raw = this.storage.getItem(PREFIX + id);
        if (raw === null) throw new Error(`no saved resume "${id}"`);
        return parseResume(parseJson(raw, id));
    }

    async save(id: string, resume: IResume): Promise<void> {
        this.storage.setItem(PREFIX + id, JSON.stringify(resume));
    }

    async remove(id: string): Promise<void> {
        this.storage.removeItem(PREFIX + id);
    }

    // Quick read for list(); full validation happens in load().
    private peek(key: string): IResumeEntry | null {
        try {
            const raw = JSON.parse(this.storage.getItem(key) ?? "");
            return {
                id: key.slice(PREFIX.length),
                filename: String(raw.filename),
                date: String(raw.date),
            };
        } catch {
            return null;
        }
    }
}

function parseJson(raw: string, id: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        throw new ResumeParseError(
            "resume",
            `saved file "${id}" is not valid JSON`,
        );
    }
}
