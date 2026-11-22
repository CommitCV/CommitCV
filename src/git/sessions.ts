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
}

const keyOf = (connectionId: string, path: string) =>
    `${connectionId}\n${path}`;

export class SessionStore implements ISessionStore {
    private readonly factory?: IDBFactory;
    private db?: Promise<IDBDatabase>;

    constructor(factory?: IDBFactory) {
        this.factory = factory;
    }

    private open(): Promise<IDBDatabase> {
        this.db ??= openDb(this.factory).catch((error) => {
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
        const rows = await request<{ session: ISession }[]>(
            db.transaction(SESSIONS).objectStore(SESSIONS).getAll(),
        );
        return rows
            .map((r) => r.session)
            .filter((s) => !connectionId || s.connectionId === connectionId);
    }
}

/** Non-durable store for tests and callers that do not need persistence. */
export class MemorySessionStore implements ISessionStore {
    private readonly rows = new Map<string, ISession>();
    async get(connectionId: string, path: string) {
        return this.rows.get(keyOf(connectionId, path));
    }
    async put(session: ISession) {
        this.rows.set(keyOf(session.connectionId, session.path), session);
    }
    async delete(connectionId: string, path: string) {
        this.rows.delete(keyOf(connectionId, path));
    }
    async list(connectionId?: string) {
        return [...this.rows.values()].filter(
            (s) => !connectionId || s.connectionId === connectionId,
        );
    }
}

export const sessions: ISessionStore = new SessionStore();
