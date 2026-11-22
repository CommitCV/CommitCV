import type { IResume } from "@resume/resume";
import { lastEdited } from "@resume/library-entries";
import type { IResumeEntry } from "@storage/resume-storage";
import { useInView } from "./use-in-view";
import { useRemoteThumbnail } from "./use-remote-thumbnail";

interface RemoteResumeCardProps {
    entry: IResumeEntry;
    /** `owner/repo` the file lives in. */
    repo: string;
    /** Cache key for the preview: one per connection and path. */
    thumbnailKey: string;
    /** The file's content, once read; the preview renders from it. */
    resume?: IResume;
    /** "Unsaved session · 5m ago", when the file has one. */
    sessionLabel?: string;
    onOpen: (id: string) => void;
}

/** A resume in a git repository, laid out like a local library card. */
export default function RemoteResumeCard({
    entry,
    repo,
    thumbnailKey,
    resume,
    sessionLabel,
    onOpen,
}: RemoteResumeCardProps) {
    const [ref, visible] = useInView();
    const thumbnail = useRemoteThumbnail(thumbnailKey, resume, visible);
    return (
        <li
            ref={ref}
            data-testid="library-card"
            className="flex flex-col overflow-hidden rounded-md border-4 border-border-light bg-light-200 dark:border-border-dark dark:bg-dark-100">
            <button
                type="button"
                aria-label={`Open ${entry.id}`}
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
                            Remote
                        </span>
                    </span>
                    <span className="block truncate text-sm text-light-700 dark:text-dark-700">
                        {repo}
                    </span>
                    {(entry.date || entry.updatedAt !== undefined) && (
                        <span className="block text-sm text-light-700 dark:text-dark-700">
                            {lastEdited(entry)}
                        </span>
                    )}
                    {sessionLabel && (
                        <span
                            data-testid="session-badge"
                            className="mt-1 inline-block rounded bg-light-300 px-1.5 py-0.5 text-xs font-semibold dark:bg-dark-200">
                            {sessionLabel}
                        </span>
                    )}
                </div>
            </button>
        </li>
    );
}
