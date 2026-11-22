import type { ExportKind } from "@resume/export-resume";
import { lastEdited } from "@resume/library-entries";
import type { IResumeEntry } from "@storage/resume-storage";
import { useCardMenu } from "./use-card-menu";
import { useThumbnail } from "./use-thumbnail";

interface ResumeCardProps {
    entry: IResumeEntry;
    onOpen: (id: string) => void;
    onExport: (id: string, kind: ExportKind) => void;
    onDelete: (id: string) => void;
}

export default function ResumeCard({
    entry,
    onOpen,
    onExport,
    onDelete,
}: ResumeCardProps) {
    const thumbnail = useThumbnail(entry.id);
    const { onContextMenu, kebab, popup, confirm } = useCardMenu({
        name: entry.filename,
        onOpen: () => onOpen(entry.id),
        onExport: (kind) => onExport(entry.id, kind),
        onDelete: () => onDelete(entry.id),
    });

    return (
        <li
            data-testid="library-card"
            onContextMenu={onContextMenu}
            className="relative flex flex-col overflow-hidden rounded-md border-4 border-border-light bg-light-200 dark:border-border-dark dark:bg-dark-100">
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
                <div className="p-3 pr-12">
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
            {kebab}
            {confirm}
            {popup}
        </li>
    );
}
