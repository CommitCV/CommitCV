export const DB_NAME = "commitcv";
export const RESUMES = "resumes";
export const THUMBNAILS = "thumbnails";
export const CONNECTIONS = "connections";
export const SESSIONS = "sessions";
const DB_VERSION = 4;

/** One opener for the shared database so every store upgrades together. */
export function openDb(factory?: IDBFactory): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = (factory ?? indexedDB).open(DB_NAME, DB_VERSION);
        // Older databases already have some stores; only add what's missing.
        req.onupgradeneeded = () => {
            for (const name of [RESUMES, THUMBNAILS, CONNECTIONS, SESSIONS]) {
                if (!req.result.objectStoreNames.contains(name)) {
                    req.result.createObjectStore(name, { keyPath: "id" });
                }
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export function request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}
