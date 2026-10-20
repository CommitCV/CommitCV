/**
 * Persistent storage: asks the browser not to evict our IndexedDB data
 * when disk space runs low. It does not stop the user clearing site
 * data themselves, so backups still matter.
 */

type TStorageManager = Pick<
    StorageManager,
    "persisted" | "persist" | "estimate"
>;

export interface IPersistenceStatus {
    /** The browser offers the Storage API at all. */
    supported: boolean;
    /** Data is protected from automatic eviction. */
    persisted: boolean;
    /** Bytes used and available to this origin, when the browser says. */
    usage?: number;
    quota?: number;
}

// Looked up per call so importing this is safe where `navigator` has no
// storage (node tests, older browsers).
function defaultManager(): TStorageManager | undefined {
    return typeof navigator === "undefined" ? undefined : navigator.storage;
}

export async function persistenceStatus(
    manager: TStorageManager | undefined = defaultManager(),
): Promise<IPersistenceStatus> {
    if (!manager?.persisted) return { supported: false, persisted: false };
    const [persisted, estimate] = await Promise.all([
        manager.persisted(),
        manager.estimate?.().catch(() => undefined),
    ]);
    return {
        supported: true,
        persisted,
        usage: estimate?.usage,
        quota: estimate?.quota,
    };
}

/**
 * Asks for persistence unless already granted. Resolves to whether
 * data is now protected; never rejects. Call from a user action, since
 * some browsers show a prompt.
 */
export async function requestPersistence(
    manager: TStorageManager | undefined = defaultManager(),
): Promise<boolean> {
    if (!manager?.persisted || !manager.persist) return false;
    try {
        return (await manager.persisted()) || (await manager.persist());
    } catch {
        return false;
    }
}
