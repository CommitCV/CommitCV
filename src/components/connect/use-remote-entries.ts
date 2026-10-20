import { useCallback, useEffect, useState } from "react";
import type { IResumeEntry } from "@storage/resume-storage";
import { resumeStorages, useResumeStore } from "@store/useResumeStore";

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

/** Loads a repo file into the editor store; the caller navigates. */
export async function openRemote(connectionId: string, path: string) {
    const resume = await resumeStorages.git(connectionId).load(path);
    useResumeStore.getState().load(resume, { kind: "git", connectionId, path });
}
