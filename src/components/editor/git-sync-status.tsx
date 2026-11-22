import { useEffect, useState } from "react";
import { Link } from "react-router";
import Button from "@components/ui/button";
import { syncLabel } from "@store/sync-label";
import { useResumeStore } from "@store/useResumeStore";

function useNow(everyMs: number): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), everyMs);
        return () => clearInterval(id);
    }, [everyMs]);
    return now;
}

export default function GitSyncStatus() {
    const saveState = useResumeStore((s) => s.saveState);
    const sync = useResumeStore((s) => s.sync);
    const saveError = useResumeStore((s) => s.saveError);
    const resolve = useResumeStore((s) => s.resolveConflict);
    const resolveDivergence = useResumeStore((s) => s.resolveDivergence);
    const now = useNow(5000);
    const busy = saveState === "saving";

    return (
        <>
            <span
                role="status"
                className="text-xs text-light-700 dark:text-dark-700">
                {sync.phase === "auth" ? (
                    <>
                        Sync stopped — sign-in expired.{" "}
                        <Link
                            to="/signin"
                            className="underline">
                            Reconnect
                        </Link>
                    </>
                ) : (
                    syncLabel(saveState, sync, now)
                )}
            </span>
            {sync.phase === "conflict" && (
                <div
                    role="alert"
                    className="flex w-full flex-wrap items-center gap-2 text-xs">
                    <span>
                        This file changed in the repository while you edited it.
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void resolve("mine")}>
                        Keep mine
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void resolve("remote")}>
                        Take remote
                    </Button>
                </div>
            )}
            {sync.phase === "diverged" && (
                <div
                    role="alert"
                    className="flex w-full flex-wrap items-center gap-2 text-xs">
                    <span>This session was updated elsewhere.</span>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void resolveDivergence("remote")}>
                        Use remote version
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void resolveDivergence("mine")}>
                        Keep my version (overwrite remote)
                    </Button>
                </div>
            )}
            {saveState === "error" && saveError && (
                <span className="sr-only">{saveError}</span>
            )}
        </>
    );
}
