import { useState } from "react";
import { useNavigate } from "react-router-dom";
import starter from "@resume/starter-resume.json";
import type { IResume } from "@resume/resume";
import { today } from "@resume/dates";
import Button from "@components/ui/button";
import { useResumeStore } from "@store/useResumeStore";

const slug = (name: string) =>
    name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/\.json$/, "");

interface NewRemoteResumeProps {
    connectionId: string;
    existing: string[];
}

/** Creates a starter resume and commits it to the repository. */
export default function NewRemoteResume({
    connectionId,
    existing,
}: NewRemoteResumeProps) {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function create() {
        const base = slug(name);
        const path = `${base}.json`;
        if (!base) return setError("Enter a file name.");
        if (existing.includes(path)) {
            return setError(`${path} already exists in this repository.`);
        }
        setError("");
        setBusy(true);
        const resume: IResume = {
            ...structuredClone(starter as unknown as IResume),
            filename: base,
            date: today(),
        };
        const store = useResumeStore.getState();
        store.load(resume, { kind: "git", connectionId, path });
        await store.save(`add ${path}`);
        setBusy(false);
        const { saveState, saveError } = useResumeStore.getState();
        if (saveState === "error") {
            setError(saveError ?? "Unable to save to the repository.");
            return;
        }
        navigate("/editor");
    }

    return (
        <div className="mt-4 border-t border-border-light pt-4 dark:border-border-dark">
            <label className="block text-sm font-medium">
                New resume file name
                <div className="mt-1 flex gap-2">
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="my-resume"
                        className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-1.5 font-normal outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200"
                    />
                    <Button
                        type="button"
                        size="sm"
                        disabled={busy || !name.trim()}
                        onClick={() => void create()}>
                        {busy ? "Saving…" : "Create and commit"}
                    </Button>
                </div>
            </label>
            {error && (
                <p
                    role="alert"
                    className="mt-2 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
