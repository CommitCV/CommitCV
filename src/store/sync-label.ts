import type { ISyncState, TSaveState } from "./useResumeStore";

export function ago(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
}

/** Status text for a git-backed resume; the auth case is rendered as a link. */
export function syncLabel(
    saveState: TSaveState,
    sync: ISyncState,
    now: number,
): string {
    if (sync.phase === "syncing") return "Syncing…";
    if (sync.phase === "retrying") return "Sync failed — retrying";
    if (saveState === "saving") return "Saving…";
    if (saveState === "error") return "Save failed";
    if (saveState === "dirty") return "Unsaved changes";
    if (sync.autosavedAt !== null) {
        return `Autosaved ${ago(now - sync.autosavedAt)}`;
    }
    return "Saved";
}
