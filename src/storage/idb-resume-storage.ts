import type { IResume } from "@resume/resume";
import { parseResume } from "@resume/parse-resume";
import {
    openDb,
    request,
    RESUMES as STORE,
    THUMBNAILS,
    transactionDone,
} from "./db";
import { compressJson, decompressJson } from "./compress";
import type { IResumeEntry, IResumeStorage } from "./resume-storage";

/**
 * What's stored. `filename` and `date` sit beside the gzipped resume so
 * listing never decompresses. Records written before compression hold
 * the resume itself in `resume` and are read as-is until next saved.
 */
interface IRecord {
    id: string;
    filename: string;
    date: string;
    updatedAt: number;
    data?: Uint8Array<ArrayBuffer>;
    resume?: IResume;
}

/** A cached first-page preview, valid while `hash` matches the resume. */
export interface IThumbnail {
    hash: string;
    blob: Blob;
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
    // Saves compress before writing, so they run one at a time in call
    // order, and a read started right after an unawaited save (autosave
    // on leaving the editor) waits for the queue to drain.
    private queue: Promise<unknown> = Promise.resolve();

    // The factory defaults to the global at first use, so importing
    // this module is safe where IndexedDB doesn't exist (node tests).
    constructor(factory?: IDBFactory, legacy?: IResumeStorage) {
        this.factory = factory;
        this.legacy = legacy;
    }

    async list(): Promise<IResumeEntry[]> {
        await this.settled();
        const records = await this.all();
        return records.map(({ id, filename, date, resume, updatedAt }) => ({
            id,
            filename: filename ?? resume?.filename ?? "",
            date: date ?? resume?.date ?? "",
            updatedAt,
        }));
    }

    async load(id: string): Promise<IResume> {
        await this.settled();
        const record = await this.get(id);
        if (!record) throw new Error(`no saved resume "${id}"`);
        const resume = record.data
            ? await decompressJson(record.data)
            : record.resume;
        return parseResume(resume);
    }

    save(id: string, resume: IResume): Promise<void> {
        return this.enqueue(async () => {
            await this.ready();
            await this.put(id, resume);
        });
    }

    remove(id: string): Promise<void> {
        return this.enqueue(async () => {
            await this.ready();
            const db = await this.open();
            const tx = db.transaction([STORE, THUMBNAILS], "readwrite");
            tx.objectStore(STORE).delete(id);
            tx.objectStore(THUMBNAILS).delete(id);
            await transactionDone(tx);
        });
    }

    async saveThumbnail(id: string, hash: string, blob: Blob): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(THUMBNAILS, "readwrite");
        tx.objectStore(THUMBNAILS).put({ id, hash, blob });
        await transactionDone(tx);
    }

    async loadThumbnail(id: string): Promise<IThumbnail | undefined> {
        const db = await this.open();
        const record = await request<IThumbnail | undefined>(
            db.transaction(THUMBNAILS).objectStore(THUMBNAILS).get(id),
        );
        return record && { hash: record.hash, blob: record.blob };
    }

    private enqueue(job: () => Promise<void>): Promise<void> {
        const run = this.queue.then(job);
        this.queue = run.catch(() => undefined);
        return run;
    }

    private async ready(): Promise<void> {
        this.migrated ??= this.migrate().catch((error) => {
            this.migrated = undefined;
            throw error;
        });
        await this.migrated;
    }

    /** `ready`, plus every save and remove already requested. */
    private async settled(): Promise<void> {
        await this.ready();
        await this.queue;
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
                    await this.put(entry.id, resume);
                }
                await this.legacy.remove(entry.id);
            } catch {
                continue;
            }
        }
    }

    private open(): Promise<IDBDatabase> {
        this.db ??= openDb(this.factory, () => {
            this.db = undefined;
        }).catch((error) => {
            this.db = undefined;
            throw error;
        });
        return this.db;
    }

    private async all(): Promise<IRecord[]> {
        const db = await this.open();
        return request(db.transaction(STORE).objectStore(STORE).getAll());
    }

    private async get(id: string): Promise<IRecord | undefined> {
        const db = await this.open();
        return request(db.transaction(STORE).objectStore(STORE).get(id));
    }

    private async put(id: string, resume: IResume): Promise<void> {
        const record: IRecord = {
            id,
            filename: resume.filename,
            date: resume.date,
            updatedAt: Date.now(),
            data: await compressJson(resume),
        };
        const db = await this.open();
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(record);
        await transactionDone(tx);
    }
}
