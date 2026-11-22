import { openDb, request, SESSIONS, transactionDone } from "../storage/db";

/**
 * An in-progress editing session: autosaves go to `branch`, and a manual
 * commit squashes it onto the default branch. Kept in IndexedDB so a reload
 * does not lose track of the branch or what was last pushed.
 */
export interface ISession {
    connectionId: string;
    path: string;
    branch: string;
    /** Default branch head when the session started (merge base). */
    baseSha: string;
    /** Latest local session commit. */
    headSha: string | null;
    /** Latest session commit known to be on the remote. */
    lastPushedSha: string | null;
    startedAt: number;
}

export interface ISessionStore {
    get(connectionId: string, path: string): Promise<ISession | undefined>;
    put(session: ISession): Promise<void>;
    delete(connectionId: string, path: string): Promise<void>;
    list(connectionId?: string): Promise<ISession[]>;
    /**
     * The commit the editor's document derives from, kept across reloads so a
     * restored draft still has a merge base before its first session exists.
     */
    getBase(connectionId: string, path: string): Promise<string | undefined>;
    setBase(connectionId: string, path: string, sha: string): Promise<void>;
}

const keyOf = (connectionId: string, path: string) =>
    `${connectionId}\n${path}`;
const baseKeyOf = (connectionId: string, path: string) =>
    `base\n${keyOf(connectionId, path)}`;

export class SessionStore implements ISessionStore {
    private readonly factory?: IDBFactory;
    private db?: Promise<IDBDatabase>;

    constructor(factory?: IDBFactory) {
        this.factory = factory;
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

    async get(connectionId: string, path: string) {
        const db = await this.open();
        const row = await request<{ session: ISession } | undefined>(
            db
                .transaction(SESSIONS)
                .objectStore(SESSIONS)
                .get(keyOf(connectionId, path)),
        );
        return row?.session;
    }

    async put(session: ISession): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(SESSIONS, "readwrite");
        tx.objectStore(SESSIONS).put({
            id: keyOf(session.connectionId, session.path),
            session,
        });
        await transactionDone(tx);
    }

    async delete(connectionId: string, path: string): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(SESSIONS, "readwrite");
        tx.objectStore(SESSIONS).delete(keyOf(connectionId, path));
        await transactionDone(tx);
    }

    async list(connectionId?: string): Promise<ISession[]> {
        const db = await this.open();
        const rows = await request<{ session?: ISession }[]>(
            db.transaction(SESSIONS).objectStore(SESSIONS).getAll(),
        );
        // Base rows share the store but carry no session.
        return rows
            .flatMap((r) => (r.session ? [r.session] : []))
            .filter((s) => !connectionId || s.connectionId === connectionId);
    }

    async getBase(connectionId: string, path: string) {
        const db = await this.open();
        const row = await request<{ baseSha: string } | undefined>(
            db
                .transaction(SESSIONS)
                .objectStore(SESSIONS)
                .get(baseKeyOf(connectionId, path)),
        );
        return row?.baseSha;
    }

    async setBase(connectionId: string, path: string, sha: string) {
        const db = await this.open();
        const tx = db.transaction(SESSIONS, "readwrite");
        tx.objectStore(SESSIONS).put({
            id: baseKeyOf(connectionId, path),
            baseSha: sha,
        });
        await transactionDone(tx);
    }
}

/** Non-durable store for tests and callers that do not need persistence. */
export class MemorySessionStore implements ISessionStore {
    private readonly rows = new Map<string, ISession>();
    private readonly bases = new Map<string, string>();
    async get(connectionId: string, path: string) {
        return this.rows.get(keyOf(connectionId, path));
    }
    async put(session: ISession) {
        this.rows.set(keyOf(session.connectionId, session.path), session);
    }
    async delete(connectionId: string, path: string) {
        this.rows.delete(keyOf(connectionId, path));
    }
    async getBase(connectionId: string, path: string) {
        return this.bases.get(keyOf(connectionId, path));
    }
    async setBase(connectionId: string, path: string, sha: string) {
        this.bases.set(keyOf(connectionId, path), sha);
    }
    async list(connectionId?: string) {
        return [...this.rows.values()].filter(
            (s) => !connectionId || s.connectionId === connectionId,
        );
    }
}

export const sessions: ISessionStore = new SessionStore();
