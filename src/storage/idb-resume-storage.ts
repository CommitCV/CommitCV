import type { IResume } from "@resume/resume";
import { parseResume } from "@resume/parse-resume";
import type { IResumeEntry, IResumeStorage } from "./resume-storage";

const DB_NAME = "commitcv";
const STORE = "resumes";

interface IRecord {
    id: string;
    resume: IResume;
    updatedAt: number;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

/**
 * Resumes in the browser's IndexedDB. Holds more than localStorage's
 * ~5MB quota allows and records when each resume was last saved.
 *
 * Resumes left in `legacy` (the old localStorage adapter) are moved
 * over before the first read or write.
 */
export class IdbResumeStorage implements IResumeStorage {
    private readonly factory?: IDBFactory;
    private readonly legacy?: IResumeStorage;
    private db?: Promise<IDBDatabase>;
    private migrated?: Promise<void>;

    // The factory defaults to the global at first use, so importing
    // this module is safe where IndexedDB doesn't exist (node tests).
    constructor(factory?: IDBFactory, legacy?: IResumeStorage) {
        this.factory = factory;
        this.legacy = legacy;
    }

    async list(): Promise<IResumeEntry[]> {
        await this.ready();
        const records = await this.all();
        return records.map(({ id, resume, updatedAt }) => ({
            id,
            filename: resume.filename,
            date: resume.date,
            updatedAt,
        }));
    }

    async load(id: string): Promise<IResume> {
        await this.ready();
        const record = await this.get(id);
        if (!record) throw new Error(`no saved resume "${id}"`);
        return parseResume(record.resume);
    }

    async save(id: string, resume: IResume): Promise<void> {
        await this.ready();
        await this.put({ id, resume, updatedAt: Date.now() });
    }

    async remove(id: string): Promise<void> {
        await this.ready();
        const db = await this.open();
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        await transactionDone(tx);
    }

    private ready(): Promise<void> {
        this.migrated ??= this.migrate().catch((error) => {
            this.migrated = undefined;
            throw error;
        });
        return this.migrated;
    }

    // Moves each legacy resume over, then deletes it. An id that already
    // has an IndexedDB copy keeps that copy, since it is at least as new.
    // One that fails to read or write stays where it is so nothing is lost.
    private async migrate(): Promise<void> {
        if (!this.legacy) return;
        for (const entry of await this.legacy.list()) {
            try {
                if (!(await this.get(entry.id))) {
                    const resume = await this.legacy.load(entry.id);
                    await this.put({
                        id: entry.id,
                        resume,
                        updatedAt: Date.now(),
                    });
                }
                await this.legacy.remove(entry.id);
            } catch {
                continue;
            }
        }
    }

    private open(): Promise<IDBDatabase> {
        const db = (this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
            const req = (this.factory ?? indexedDB).open(DB_NAME, 1);
            req.onupgradeneeded = () =>
                req.result.createObjectStore(STORE, { keyPath: "id" });
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }).catch((error) => {
            this.db = undefined;
            throw error;
        }));
        return db;
    }

    private async all(): Promise<IRecord[]> {
        const db = await this.open();
        return request(db.transaction(STORE).objectStore(STORE).getAll());
    }

    private async get(id: string): Promise<IRecord | undefined> {
        const db = await this.open();
        return request(db.transaction(STORE).objectStore(STORE).get(id));
    }

    private async put(record: IRecord): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(record);
        await transactionDone(tx);
    }
}
