import { useState } from "react";
import Button from "@components/ui/button";
import { lastEdited } from "@resume/library-entries";
import type { IResumeEntry } from "@storage/resume-storage";
import { useThumbnail } from "./use-thumbnail";

interface ResumeCardProps {
    entry: IResumeEntry;
    onOpen: (id: string) => void;
    onDownload: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function ResumeCard({
    entry,
    onOpen,
    onDownload,
    onDelete,
}: ResumeCardProps) {
    const thumbnail = useThumbnail(entry.id);
    const [confirming, setConfirming] = useState(false);

    return (
        <li
            data-testid="library-card"
            className="flex flex-col overflow-hidden rounded-md border-4 border-border-light bg-light-200 dark:border-border-dark dark:bg-dark-100">
            <button
                type="button"
                aria-label={`Open ${entry.filename}`}
                onClick={() => onOpen(entry.id)}
                className="flex flex-1 flex-col text-left hover:opacity-90">
                <div className="flex aspect-[8.5/11] w-full items-center justify-center bg-light-300 dark:bg-dark-200">
                    {thumbnail ? (
                        <img
                            data-testid="library-thumbnail"
                            src={thumbnail}
                            alt=""
                            className="h-full w-full object-cover object-top"
                        />
                    ) : (
                        <span
                            data-testid="library-thumbnail-placeholder"
                            className="text-sm text-light-700 dark:text-dark-700">
                            Preview loading
                        </span>
                    )}
                </div>
                <div className="p-3">
                    <span className="flex items-center gap-2">
                        <span className="truncate font-semibold">
                            {entry.filename}
                        </span>
                        <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-light-50 dark:text-dark-50">
                            Local
                        </span>
                    </span>
                    <span className="block text-sm text-light-700 dark:text-dark-700">
                        {lastEdited(entry)}
                    </span>
                </div>
            </button>
            <div className="flex flex-wrap items-center gap-2 border-t-2 border-border-light p-2 dark:border-border-dark">
                {confirming ? (
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="text-red-600"
                            onClick={() => onDelete(entry.id)}>
                            Confirm delete {entry.filename}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirming(false)}>
                            Cancel
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Download ${entry.filename} JSON`}
                            onClick={() => onDownload(entry.id)}>
                            Download JSON
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${entry.filename}`}
                            className="text-red-600"
                            onClick={() => setConfirming(true)}>
                            Delete
                        </Button>
                    </>
                )}
            </div>
        </li>
    );
}
