import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@components/ui/button";
import { buttonClass } from "@components/ui/button-class";
import {
    useRemoteEntries,
    useRemoteSessions,
} from "@components/connect/use-remote-entries";
import { useOpenGitResume } from "@components/session/use-open-git-resume";
import { sessionAge } from "@store/open-git-resume";
import { connections, type IConnection } from "../../git/connections";
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

function Repo({ connection }: { connection: IConnection }) {
    const { entries, error, reload } = useRemoteEntries(connection.id);
    const found = useRemoteSessions(connection.id, !!entries);
    const { open: openFile, dialog } = useOpenGitResume();
    const [openError, setOpenError] = useState("");
    const { path, host } = repoOf(connection);

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
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={reload}>
                    Refresh
                </Button>
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
                                sessionLabel={
                                    session
                                        ? `Unsaved session · ${sessionAge(found.at - session.lastCommit.date)}`
                                        : undefined
                                }
                                onOpen={(id) => void open(id)}
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
                />
            ))}
        </section>
    );
}
