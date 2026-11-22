import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IResumeEntry } from "@storage/resume-storage";
import { openRemote } from "./use-remote-entries";

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
    const navigate = useNavigate();
    const [openError, setOpenError] = useState("");

    async function open(path: string) {
        setOpenError("");
        try {
            await openRemote(connectionId, path);
            navigate("/editor");
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
            {entries?.length === 0 && (
                <p className="text-sm text-light-700 dark:text-dark-700">
                    No resume files (.json) in this repository yet.
                </p>
            )}
            {!!entries?.length && (
                <ul className="space-y-1">
                    {entries.map((entry) => (
                        <li key={entry.id}>
                            <button
                                type="button"
                                aria-label={`Open ${entry.id}`}
                                onClick={() => void open(entry.id)}
                                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-light-300 dark:hover:bg-dark-200">
                                {entry.filename}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
