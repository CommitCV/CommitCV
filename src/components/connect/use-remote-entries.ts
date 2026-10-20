import { useCallback, useEffect, useState } from "react";
import type { ISessionInfo } from "@storage/git-resume-storage";
import type { IResumeEntry } from "@storage/resume-storage";
import { resumeStorages } from "@store/useResumeStore";

const message = (reason: unknown, fallback: string) =>
    reason instanceof Error ? reason.message : fallback;

/** Lazily lists a connection's resume files; `entries` is undefined while loading. */
export function useRemoteEntries(connectionId: string) {
    const [state, setState] = useState<{
        id: string;
        entries?: IResumeEntry[];
        error: string;
    }>({ id: connectionId, error: "" });
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let active = true;
        resumeStorages
            .git(connectionId)
            .list()
            .then(
                (entries) =>
                    active &&
                    setState({ id: connectionId, entries, error: "" }),
                (reason: unknown) =>
                    active &&
                    setState({
                        id: connectionId,
                        error: message(reason, "Unable to list repository"),
                    }),
            );
        return () => {
            active = false;
        };
    }, [connectionId, nonce]);

    const current: { entries?: IResumeEntry[]; error: string } =
        state.id === connectionId ? state : { error: "" };
    const reload = useCallback(() => {
        setState({ id: connectionId, error: "" });
        setNonce((n) => n + 1);
    }, [connectionId]);
    return { entries: current.entries, error: current.error, reload };
}

/**
 * Files with an unsquashed session (newest session per path), found lazily
 * once `enabled`; a failure only means no badges and is reported as `error`.
 */
export function useRemoteSessions(connectionId: string, enabled: boolean) {
    const [state, setState] = useState<{
        id: string;
        sessions?: Record<string, ISessionInfo>;
        error: boolean;
        at: number;
    }>({ id: connectionId, error: false, at: 0 });

    useEffect(() => {
        if (!enabled) return;
        let active = true;
        const storage = resumeStorages.git(connectionId);
        if (!("listSessions" in storage)) return;
        storage.listSessions().then(
            (all) => {
                if (!active) return;
                const sessions: Record<string, ISessionInfo> = {};
                // Sorted newest first, so the first one per path wins.
                for (const info of all) sessions[info.path] ??= info;
                setState({
                    id: connectionId,
                    sessions,
                    error: false,
                    at: Date.now(),
                });
            },
            () =>
                active &&
                setState({ id: connectionId, error: true, at: Date.now() }),
        );
        return () => {
            active = false;
        };
    }, [connectionId, enabled]);

    return state.id === connectionId
        ? state
        : { sessions: undefined, error: false, at: 0 };
}
