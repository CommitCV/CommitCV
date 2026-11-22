import {
    CONNECTIONS,
    KEYS,
    openDb,
    request,
    transactionDone,
} from "../storage/db";
import type { GitIdentity } from "./identity";
import type { GitProvider } from "./remote-config";

/**
 * A saved git remote. The token lives only here, in IndexedDB: never in
 * localStorage, the persisted draft, or a resume source (which holds `id`).
 * On disk the access and refresh tokens are AES-GCM encrypted with a
 * non-extractable key (see `seal`), so they are not readable as plain text.
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

interface ISealed {
    iv: Uint8Array<ArrayBuffer>;
    data: ArrayBuffer;
}

/** What is encrypted: the secrets only, so host and expiry stay queryable. */
interface ISecrets {
    token: string;
    refreshToken?: string;
}

type TStored = Omit<IConnection, "token"> & {
    token: string;
    sealed?: ISealed;
};

const KEY_ID = "connections";

/**
 * The per-browser encryption key. It is generated non-extractable and kept
 * in IndexedDB as a CryptoKey, so its bytes can never be read, only used.
 * This hides tokens from disk, backups and a glance at devtools; it does not
 * stop a script running on this origin, which is what the server's
 * Content-Security-Policy is for.
 */
async function getKey(db: IDBDatabase): Promise<CryptoKey> {
    const read = () =>
        request<{ key: CryptoKey } | undefined>(
            db.transaction(KEYS).objectStore(KEYS).get(KEY_ID),
        );
    const existing = await read();
    if (existing) return existing.key;
    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
    // Another tab may have won the race; keep whichever key landed first.
    const tx = db.transaction(KEYS, "readwrite");
    const store = tx.objectStore(KEYS);
    const raced = await request<{ key: CryptoKey } | undefined>(
        store.get(KEY_ID),
    );
    if (!raced) store.put({ id: KEY_ID, key });
    await transactionDone(tx);
    return raced?.key ?? key;
}

async function seal(db: IDBDatabase, c: IConnection): Promise<TStored> {
    const secrets: ISecrets = {
        token: c.token,
        refreshToken: c.oauth?.refreshToken,
    };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await getKey(db),
        new TextEncoder().encode(JSON.stringify(secrets)),
    );
    const stored: TStored = { ...c, token: "", sealed: { iv, data } };
    if (c.oauth) {
        stored.oauth = { host: c.oauth.host, expiresAt: c.oauth.expiresAt };
    }
    return stored;
}

/** Decrypts a stored record; a legacy plaintext one passes straight through. */
async function open(db: IDBDatabase, stored: TStored): Promise<IConnection> {
    const { sealed, ...rest } = stored;
    if (!sealed) return rest as IConnection;
    const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: sealed.iv },
        await getKey(db),
        sealed.data,
    );
    const secrets = JSON.parse(new TextDecoder().decode(plain)) as ISecrets;
    return {
        ...rest,
        token: secrets.token,
        ...(rest.oauth
            ? { oauth: { ...rest.oauth, refreshToken: secrets.refreshToken } }
            : {}),
    };
}

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
        const rows = await request<TStored[]>(
            db.transaction(CONNECTIONS).objectStore(CONNECTIONS).getAll(),
        );
        return Promise.all(rows.map((row) => open(db, row)));
    }

    async get(id: string): Promise<IConnection | undefined> {
        const db = await this.open();
        const row = await request<TStored | undefined>(
            db.transaction(CONNECTIONS).objectStore(CONNECTIONS).get(id),
        );
        return row && open(db, row);
    }

    async add(connection: TNewConnection): Promise<IConnection> {
        const saved = { ...connection, id: crypto.randomUUID() };
        await this.put(saved);
        return saved;
    }

    async update(connection: IConnection): Promise<void> {
        await this.put(connection);
    }

    private async put(connection: IConnection): Promise<void> {
        const db = await this.open();
        // Encrypt before opening the transaction: it would auto-commit
        // while awaiting the non-IndexedDB crypto call.
        const stored = await seal(db, connection);
        const tx = db.transaction(CONNECTIONS, "readwrite");
        tx.objectStore(CONNECTIONS).put(stored);
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
