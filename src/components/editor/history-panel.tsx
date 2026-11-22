import { useEffect, useId, useRef, useState } from "react";
import type { IResume } from "@resume/resume";
import Button from "@components/ui/button";
import ResumePreview from "@components/editor/resume-preview";
import { entryMeta, restoreSummary } from "@resume/history-entries";
import type { IHistoryEntry, IVersionedStorage } from "@storage/resume-storage";
import { storageFor, useResumeStore } from "@store/useResumeStore";
import { trackGitFor } from "../../git/track";

const PAGE = 20;

const message = (err: unknown) =>
    err instanceof Error ? err.message : String(err);

/** Restore points of the open git resume; Restore loads one as a new edit. */
export default function HistoryPanel({ onClose }: { onClose: () => void }) {
    const source = useResumeStore((s) => s.source);
    const current = useResumeStore((s) => s.resume);
    const uncommitted = useResumeStore(
        (s) => s.saveState !== "clean" || s.sync.autosavedAt !== null,
    );
    const restore = useResumeStore((s) => s.restore);
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const [entries, setEntries] = useState<IHistoryEntry[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<IHistoryEntry | null>(null);
    const [loaded, setLoaded] = useState<{
        sha: string;
        resume?: IResume;
        error?: string;
    } | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [now] = useState(() => Date.now());

    const storage =
        source?.kind === "git"
            ? (storageFor(source) as Partial<IVersionedStorage>)
            : null;
    const path = source?.kind === "git" ? source.path : "";
    const shown = loaded?.sha === selected?.sha ? loaded : null;
    const version = shown?.resume ?? null;
    const versionError = shown?.error ?? "";

    const connectionId = source?.kind === "git" ? source.connectionId : "";
    useEffect(() => {
        if (connectionId)
            void trackGitFor(connectionId, "git history opened", {});
    }, [connectionId]);

    useEffect(() => {
        const dialog = ref.current;
        const opener = document.activeElement;
        if (dialog && !dialog.open) dialog.showModal();
        return () => {
            dialog?.close();
            // The dialog is unmounted, so the browser can't restore focus.
            if (opener instanceof HTMLElement) opener.focus();
        };
    }, []);

    function loadPage(before?: string) {
        if (!storage?.history) return;
        setLoading(true);
        setError("");
        storage
            .history(path, { limit: PAGE, before })
            .then((page) => {
                setEntries((prev) => [...prev, ...page.entries]);
                setHasMore(page.hasMore);
            })
            .catch((err: unknown) => setError(message(err)))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        // Once per open; the panel is remounted for another file.
        if (!storage?.history) return;
        storage
            .history(path, { limit: PAGE })
            .then((page) => {
                setEntries(page.entries);
                setHasMore(page.hasMore);
            })
            .catch((err: unknown) => setError(message(err)))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selected || !storage?.loadAt) return;
        let active = true;
        storage
            .loadAt(path, selected.sha)
            .then(
                (resume) => active && setLoaded({ sha: selected.sha, resume }),
            )
            .catch(
                (err: unknown) =>
                    active &&
                    setLoaded({ sha: selected.sha, error: message(err) }),
            );
        return () => {
            active = false;
        };
        // `storage` is stable per connection.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, path]);

    const summary = version && current ? restoreSummary(current, version) : [];

    function doRestore() {
        if (!version) return;
        restore(version);
        if (connectionId)
            void trackGitFor(connectionId, "git version restored", {});
        onClose();
    }

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            data-testid="history-panel"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            className="m-auto h-[85vh] w-full max-w-6xl overflow-hidden rounded-lg border-2 border-border-light bg-light-50 text-light-950 backdrop:bg-black/50 dark:border-border-dark dark:bg-dark-300 dark:text-dark-950">
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b-2 border-border-light px-4 py-3 dark:border-border-dark">
                    <h2
                        id={titleId}
                        className="text-xl font-bold tracking-tight">
                        History of {path}
                    </h2>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={onClose}>
                        Close
                    </Button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                    <div className="flex max-h-60 shrink-0 flex-col gap-2 overflow-y-auto border-border-light p-3 md:max-h-none md:w-80 md:border-r-2 dark:border-border-dark">
                        {error && (
                            <p
                                role="alert"
                                className="text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}
                        {!loading && !error && entries.length === 0 && (
                            <p className="text-sm text-light-700 dark:text-dark-700">
                                No saved versions yet — commit your changes to
                                create one.
                            </p>
                        )}
                        <ul
                            aria-label="Saved versions"
                            className="space-y-2">
                            {entries.map((entry) => (
                                <li key={entry.sha}>
                                    <button
                                        type="button"
                                        data-testid="history-entry"
                                        aria-pressed={
                                            selected?.sha === entry.sha
                                        }
                                        onClick={() => {
                                            setSelected(entry);
                                            setConfirming(false);
                                        }}
                                        className={`w-full rounded-md border-2 p-2 text-left text-sm ${
                                            selected?.sha === entry.sha
                                                ? "border-accent"
                                                : "border-border-light dark:border-border-dark"
                                        }`}>
                                        <span className="block font-semibold">
                                            {entry.message}
                                        </span>
                                        <span className="block text-xs text-light-700 dark:text-dark-700">
                                            {entryMeta(entry, now)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {loading && (
                            <p
                                role="status"
                                className="text-sm">
                                Loading history…
                            </p>
                        )}
                        {hasMore && !loading && (
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => loadPage(entries.at(-1)?.sha)}>
                                Load older
                            </Button>
                        )}
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col">
                        {!selected ? (
                            <p className="m-auto p-4 text-sm text-light-700 dark:text-dark-700">
                                Select a version to preview it.
                            </p>
                        ) : versionError ? (
                            <p
                                role="alert"
                                className="m-auto p-4 text-sm text-red-600 dark:text-red-400">
                                {versionError}
                            </p>
                        ) : !version ? (
                            <p
                                role="status"
                                className="m-auto p-4 text-sm">
                                Loading version…
                            </p>
                        ) : (
                            <>
                                <div
                                    data-testid="history-summary"
                                    className="max-h-40 overflow-y-auto border-b-2 border-border-light p-3 text-sm dark:border-border-dark">
                                    <p className="font-semibold">
                                        Restoring this version will change:
                                    </p>
                                    {summary.length === 0 ? (
                                        <p>
                                            Nothing: it matches your current
                                            document.
                                        </p>
                                    ) : (
                                        <ul className="list-disc pl-5">
                                            {summary.map((line, i) => (
                                                <li key={i}>{line}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="min-h-0 flex-1">
                                    <ResumePreview resume={version} />
                                </div>
                                <div className="flex flex-wrap items-center gap-2 border-t-2 border-border-light p-3 dark:border-border-dark">
                                    {confirming ? (
                                        <>
                                            <p
                                                role="alert"
                                                className="flex-1 text-sm">
                                                You have unsaved changes that
                                                will be replaced; you can undo
                                                with Ctrl+Z.
                                            </p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={doRestore}>
                                                Replace my changes
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    setConfirming(false)
                                                }>
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                                uncommitted
                                                    ? setConfirming(true)
                                                    : doRestore()
                                            }>
                                            Restore this version
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </dialog>
    );
}
