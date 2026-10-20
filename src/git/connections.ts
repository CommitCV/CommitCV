import { CONNECTIONS, openDb, request, transactionDone } from "../storage/db";
import type { GitIdentity } from "./identity";
import type { GitProvider } from "./remote-config";

/**
 * A saved git remote. The token lives only here, in IndexedDB: never in
 * localStorage, the persisted draft, or a resume source (which holds `id`).
 */
export interface IConnection {
    id: string;
    url: string;
    provider: GitProvider;
    label: string;
    token: string;
    author: GitIdentity;
    /** Set for OAuth sign-ins that issue expiring tokens. */
    oauth?: { host: string; refreshToken?: string; expiresAt?: number };
}

export type TNewConnection = Omit<IConnection, "id">;

export class ConnectionStore {
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

    async list(): Promise<IConnection[]> {
        const db = await this.open();
        return request<IConnection[]>(
            db.transaction(CONNECTIONS).objectStore(CONNECTIONS).getAll(),
        );
    }

    async get(id: string): Promise<IConnection | undefined> {
        const db = await this.open();
        return request<IConnection | undefined>(
            db.transaction(CONNECTIONS).objectStore(CONNECTIONS).get(id),
        );
    }

    async add(connection: TNewConnection): Promise<IConnection> {
        const saved = { ...connection, id: crypto.randomUUID() };
        const db = await this.open();
        const tx = db.transaction(CONNECTIONS, "readwrite");
        tx.objectStore(CONNECTIONS).put(saved);
        await transactionDone(tx);
        return saved;
    }

    async update(connection: IConnection): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(CONNECTIONS, "readwrite");
        tx.objectStore(CONNECTIONS).put(connection);
        await transactionDone(tx);
    }

    async remove(id: string): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(CONNECTIONS, "readwrite");
        tx.objectStore(CONNECTIONS).delete(id);
        await transactionDone(tx);
    }
}

export const connections = new ConnectionStore();
