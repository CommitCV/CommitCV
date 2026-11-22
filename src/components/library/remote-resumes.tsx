import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@components/ui/button";
import { buttonClass } from "@components/ui/button-class";
import { Xmark } from "@components/ui/icons";
import {
    useRemoteEntries,
    useRemoteSessions,
} from "@components/connect/use-remote-entries";
import { useOpenGitResume } from "@components/session/use-open-git-resume";
import { sessionAge } from "@store/open-git-resume";
import { resumeStorages } from "@store/useResumeStore";
import { exportResume, type ExportKind } from "@resume/export-resume";
import type { IResume } from "@resume/resume";
import { connections, type IConnection } from "../../git/connections";
import { hasUnsyncedEdits } from "../../git/sessions";
import { parseRepoUrl } from "../../git/remote-config";
import RemoteResumeCard from "./remote-resume-card";

function repoOf(connection: IConnection): { path: string; host: string } {
    try {
        const { path, host } = parseRepoUrl(connection.url);
        return { path, host };
    } catch {
        return { path: connection.url, host: "" };
    }
}

function Repo({
    connection,
    onRemove,
}: {
    connection: IConnection;
    onRemove: (id: string) => void;
}) {
    const [confirming, setConfirming] = useState(false);
    const { entries, error, reload } = useRemoteEntries(connection.id);
    const found = useRemoteSessions(connection.id, !!entries);
    const { open: openFile, dialog } = useOpenGitResume();
    const [openError, setOpenError] = useState("");
    const [resumes, setResumes] = useState<Map<string, IResume>>();
    const { path, host } = repoOf(connection);
    const unsynced = Object.values(found.sessions ?? {}).some(
        (s) => s.local && hasUnsyncedEdits(s.local),
    );

    // One read for every file, so previews can render as cards scroll in.
    useEffect(() => {
        if (!entries?.length) return;
        let active = true;
        const storage = resumeStorages.git(connection.id);
        if (!("peek" in storage)) return;
        storage.peek(entries.map((e) => e.id)).then(
            (found) => active && setResumes(found),
            () => {},
        );
        return () => {
            active = false;
        };
    }, [connection.id, entries]);

    async function open(id: string) {
        setOpenError("");
        try {
            await openFile(connection.id, id);
        } catch (reason) {
            setOpenError(
                reason instanceof Error
                    ? reason.message
                    : "Unable to open resume",
            );
        }
    }

    async function exportFile(id: string, kind: ExportKind) {
        setOpenError("");
        try {
            const storage = resumeStorages.git(connection.id);
            const resume =
                resumes?.get(id) ??
                ("peek" in storage ? (await storage.peek([id])).get(id) : null);
            if (!resume) throw new Error(`${id} could not be read`);
            await exportResume(resume, kind);
        } catch (reason) {
            setOpenError(
                reason instanceof Error
                    ? reason.message
                    : "Unable to download resume",
            );
        }
    }

    async function removeFile(id: string) {
        setOpenError("");
        try {
            await resumeStorages.git(connection.id).remove(id);
            reload();
        } catch (reason) {
            setOpenError(
                reason instanceof Error
                    ? reason.message
                    : "Unable to delete resume",
            );
        }
    }

    const shownError = error || openError;
    const note = "text-sm text-light-700 dark:text-dark-700";
    return (
        <section
            data-testid="remote-repo"
            aria-label={`Repository ${path}`}
            className="space-y-3">
            {dialog}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                    {path}
                    {host && (
                        <span className="text-sm font-normal text-light-700 dark:text-dark-700">
                            {host}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-1">
                    {confirming ? (
                        <>
                            <span className={note}>
                                Remove this repository?
                                {unsynced && " Unsynced edits will be lost."}
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="text-red-600"
                                aria-label={`Confirm remove ${path}`}
                                onClick={() => onRemove(connection.id)}>
                                Remove
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirming(false)}>
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={reload}>
                                Refresh
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                aria-label={`Remove ${path}`}
                                title="Remove this repository"
                                onClick={() => setConfirming(true)}>
                                <Xmark className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
            {!entries && !error && <p className={note}>Loading repository…</p>}
            {shownError && (
                <p
                    role="alert"
                    className="text-sm text-red-600">
                    {shownError}{" "}
                    {error && (
                        <button
                            type="button"
                            onClick={reload}
                            className="underline">
                            Retry
                        </button>
                    )}
                </p>
            )}
            {found.error && (
                <p className={note}>
                    Couldn&apos;t check for unsaved sessions.
                </p>
            )}
            {entries?.length === 0 && (
                <p className={note}>
                    No resume files (.json) in this repository yet.
                </p>
            )}
            {!!entries?.length && (
                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {entries.map((entry) => {
                        const session = found.sessions?.[entry.id];
                        return (
                            <RemoteResumeCard
                                key={entry.id}
                                entry={entry}
                                repo={path}
                                thumbnailKey={`remote:${connection.id}:${entry.id}`}
                                resume={resumes?.get(entry.id)}
                                sessionLabel={
                                    session
                                        ? `Unsaved session · ${sessionAge(found.at - session.lastCommit.date)}`
                                        : undefined
                                }
                                onOpen={(id) => void open(id)}
                                onExport={(id, kind) =>
                                    void exportFile(id, kind)
                                }
                                onDelete={(id) => void removeFile(id)}
                            />
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

/** Resumes in connected git repositories, grouped by repository. */
export default function RemoteResumes() {
    const [items, setItems] = useState<IConnection[]>([]);
    useEffect(() => {
        let active = true;
        connections
            .list()
            .then((all) => active && setItems(all))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const remove = (id: string) => {
        connections
            .remove(id)
            .then(() => setItems((all) => all.filter((c) => c.id !== id)))
            .catch(() => {});
    };

    return (
        <section
            aria-label="Remote repositories"
            className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight">
                    Remote resume library
                </h2>
                <Link
                    to="/signin"
                    className={buttonClass("secondary", "sm")}>
                    Connect a repository
                </Link>
            </div>
            {items.length === 0 && (
                <p className="text-sm text-light-700 dark:text-dark-700">
                    Resumes stored in your git repositories show up here.
                </p>
            )}
            {items.map((item) => (
                <Repo
                    key={item.id}
                    connection={item}
                    onRemove={remove}
                />
            ))}
        </section>
    );
}
