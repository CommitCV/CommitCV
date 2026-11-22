import { useState } from "react";
import type { IResumeEntry } from "@storage/resume-storage";
import { sessionAge } from "@store/open-git-resume";
import { useRemoteSessions } from "./use-remote-entries";
import { useOpenGitResume } from "@components/session/use-open-git-resume";

interface RemoteFilesProps {
    connectionId: string;
    entries?: IResumeEntry[];
    error: string;
    onRetry: () => void;
}

/** Resume files of one connection, with loading and error states. */
export default function RemoteFiles({
    connectionId,
    entries,
    error,
    onRetry,
}: RemoteFilesProps) {
    const { open: openFile, dialog } = useOpenGitResume();
    const [openError, setOpenError] = useState("");
    const found = useRemoteSessions(connectionId, !!entries);

    async function open(path: string) {
        setOpenError("");
        try {
            await openFile(connectionId, path);
        } catch (reason) {
            setOpenError(
                reason instanceof Error
                    ? reason.message
                    : "Unable to open resume",
            );
        }
    }

    const shownError = error || openError;
    return (
        <div data-testid="remote-files">
            {dialog}
            {!entries && !error && (
                <p className="text-sm text-light-700 dark:text-dark-700">
                    Loading repository…
                </p>
            )}
            {shownError && (
                <p
                    role="alert"
                    className="text-sm text-red-600">
                    {shownError}{" "}
                    {error && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="underline">
                            Retry
                        </button>
                    )}
                </p>
            )}
            {found.error && (
                <p className="text-sm text-light-700 dark:text-dark-700">
                    Couldn&apos;t check for unsaved sessions.
                </p>
            )}
            {entries?.length === 0 && (
                <p className="text-sm text-light-700 dark:text-dark-700">
                    No resume files (.json) in this repository yet.
                </p>
            )}
            {!!entries?.length && (
                <ul className="space-y-1">
                    {entries.map((entry) => (
                        <li
                            key={entry.id}
                            className="flex items-center gap-2">
                            <button
                                type="button"
                                aria-label={`Open ${entry.id}`}
                                onClick={() => void open(entry.id)}
                                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-light-300 dark:hover:bg-dark-200">
                                {entry.filename}
                            </button>
                            {found.sessions?.[entry.id] && (
                                <span
                                    data-testid="session-badge"
                                    className="shrink-0 rounded bg-light-300 px-1.5 py-0.5 text-xs font-semibold dark:bg-dark-200">
                                    Unsaved session ·{" "}
                                    {sessionAge(
                                        found.at -
                                            found.sessions[entry.id].lastCommit
                                                .date,
                                    )}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
