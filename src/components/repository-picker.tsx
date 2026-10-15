import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitHubResumeStorage } from "@storage/github-resume-storage";
import type { IResumeEntry } from "@storage/resume-storage";
import { useResumeStore } from "@store/useResumeStore";
import Button from "@components/ui/button";
import { Github } from "@components/ui/icons";

export default function RepositoryPicker() {
    const navigate = useNavigate();
    const load = useResumeStore((store) => store.load);
    const [repo, setRepo] = useState("");
    const [entries, setEntries] = useState<IResumeEntry[]>([]);
    const [error, setError] = useState("");

    async function loadRepository() {
        setError("");
        try {
            const storage = new GitHubResumeStorage(repo.trim());
            setEntries(await storage.list());
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Unable to load repository",
            );
        }
    }

    async function openResume(entry: IResumeEntry) {
        try {
            const storage = new GitHubResumeStorage(repo.trim());
            load(await storage.load(entry.id), {
                kind: "github",
                repo: repo.trim(),
                path: entry.id,
            });
            navigate("/editor");
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Unable to open resume",
            );
        }
    }

    return (
        <section className="rounded-lg border border-border-light p-4 dark:border-border-dark">
            <div className="mb-3 flex items-center gap-2">
                <Github className="h-5 w-5" />
                <h2 className="text-lg font-semibold">GitHub repository</h2>
            </div>
            <div className="flex gap-2">
                <input
                    aria-label="GitHub repository"
                    placeholder="owner/repository"
                    value={repo}
                    onChange={(event) => setRepo(event.target.value)}
                    className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-1.5 outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200"
                />
                <Button
                    type="button"
                    size="sm"
                    disabled={!repo.trim()}
                    onClick={() => void loadRepository()}>
                    Load
                </Button>
            </div>
            {error && (
                <p
                    role="alert"
                    className="mt-2 text-sm text-red-600">
                    {error}
                </p>
            )}
            {entries.length > 0 && (
                <ul className="mt-3 space-y-1">
                    {entries.map((entry) => (
                        <li key={entry.id}>
                            <button
                                type="button"
                                onClick={() => void openResume(entry)}
                                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-light-200 dark:hover:bg-dark-100">
                                {entry.filename}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
