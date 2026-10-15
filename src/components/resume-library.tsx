import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IResumeEntry } from "@storage/resume-storage";
import { resumeStorages, useResumeStore } from "@store/useResumeStore";
import Button from "@components/ui/button";
import { Trash } from "@components/ui/icons";

interface ResumeLibraryProps {
    compact?: boolean;
}

export default function ResumeLibrary({ compact = false }: ResumeLibraryProps) {
    const navigate = useNavigate();
    const load = useResumeStore((store) => store.load);
    const [entries, setEntries] = useState<IResumeEntry[]>([]);
    const [message, setMessage] = useState("");

    const refresh = useCallback(async () => {
        try {
            setEntries(await resumeStorages.local.list());
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load library",
            );
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        resumeStorages.local
            .list()
            .then((nextEntries) => {
                if (mounted) setEntries(nextEntries);
            })
            .catch((error: unknown) => {
                if (mounted) {
                    setMessage(
                        error instanceof Error
                            ? error.message
                            : "Unable to load library",
                    );
                }
            });
        return () => {
            mounted = false;
        };
    }, []);

    async function openResume(id: string) {
        try {
            const resume = await resumeStorages.local.load(id);
            load(resume, { kind: "local", id });
            navigate("/editor");
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to open resume",
            );
        }
    }

    async function deleteResume(id: string) {
        await resumeStorages.local.remove(id);
        await refresh();
    }

    if (entries.length === 0 && !message) return null;

    return (
        <section
            aria-labelledby="resume-library-heading"
            className={
                compact
                    ? "mt-6"
                    : "rounded-lg border border-border-light p-4 dark:border-border-dark"
            }>
            <h2
                id="resume-library-heading"
                className="mb-3 text-lg font-semibold text-light-950 dark:text-dark-950">
                Local library
            </h2>
            {message && (
                <p
                    role="alert"
                    className="mb-2 text-sm text-red-600">
                    {message}
                </p>
            )}
            <ul className="space-y-2">
                {entries.map((entry) => (
                    <li
                        key={entry.id}
                        className="flex items-center gap-2 rounded border border-border-light bg-light-200 px-3 py-2 dark:border-border-dark dark:bg-dark-100">
                        <button
                            type="button"
                            onClick={() => void openResume(entry.id)}
                            className="min-w-0 flex-1 text-left">
                            <span className="block truncate font-medium">
                                {entry.filename}
                            </span>
                            <span className="text-xs text-light-700 dark:text-dark-700">
                                {entry.date}
                            </span>
                        </button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${entry.filename}`}
                            className="px-1.5 text-red-600"
                            onClick={() => void deleteResume(entry.id)}>
                            <Trash className="h-4 w-4" />
                        </Button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
