import { Link, useNavigate } from "react-router";
import { useState } from "react";
import Button from "@components/ui/button";
import { buttonClass } from "@components/ui/button-class";
import Card from "@components/ui/card";
import { Git, Upload } from "@components/ui/icons";
import { importResumeFile } from "@resume/import-resume-file";
import { requestPersistence } from "@storage/persistence";
import { resumeStorages, useResumeStore } from "@store/useResumeStore";
import { trackResumeCreated, trackResumeImported } from "@analytics/tracker";

// Choice cards sit on the page background, inside the surface box.
// Both cards stretch to the row height, so they always match.
const choiceCard =
    "flex flex-col items-center justify-center rounded-xl border-4 border-border-light bg-light-100 text-center min-h-72 dark:border-border-dark dark:bg-dark-300";

export default function ResumeSelector() {
    const navigate = useNavigate();
    const newResume = useResumeStore((store) => store.newResume);
    const load = useResumeStore((store) => store.load);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);

    async function uploadResume(file: File) {
        try {
            const resume = await importResumeFile(file);
            const id = crypto.randomUUID();
            await resumeStorages.local.save(id, resume);
            void requestPersistence();
            load(resume, { kind: "local", id });
            trackResumeImported();
            navigate("/editor");
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Invalid resume file",
            );
        }
    }

    return (
        <div className="mx-auto w-full max-w-3xl">
            <Card
                variant="surface"
                className="p-6 md:p-8">
                <p className="mx-auto mb-8 max-w-xl text-balance text-center text-lg font-medium text-light-950 dark:text-dark-950">
                    Upload an existing resume, start a new one, or connect a git
                    repository to access your library of resumes
                </p>

                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                    <div className={`${choiceCard} gap-6 p-8`}>
                        <p className="text-xl font-semibold tracking-tight text-light-950 dark:text-dark-950">
                            Start a new resume!
                        </p>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                                // Saved straight away, so it is in the library even if untouched.
                                newResume();
                                void useResumeStore
                                    .getState()
                                    .save()
                                    .then(() => {
                                        trackResumeCreated();
                                        navigate("/editor");
                                    });
                            }}>
                            Start editing
                        </Button>
                        <p className="text-sm text-light-700 dark:text-dark-700">
                            or
                        </p>
                        <Link
                            to="/signin"
                            className={buttonClass("secondary", "md", "gap-2")}>
                            <Git className="h-4 w-4" />
                            Connect a repository
                        </Link>
                    </div>
                    <label
                        className={`${choiceCard} relative cursor-pointer p-3 transition-opacity hover:opacity-80 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent`}
                        onDragOver={(event) => {
                            if (!event.dataTransfer.types.includes("Files")) {
                                return;
                            }
                            event.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={(event) => {
                            const next = event.relatedTarget;
                            if (
                                next instanceof Node &&
                                event.currentTarget.contains(next)
                            ) {
                                return;
                            }
                            setDragging(false);
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            setDragging(false);
                            const file = event.dataTransfer.files[0];
                            if (file) void uploadResume(file);
                        }}>
                        <span
                            className={`absolute inset-3 flex flex-col items-center justify-center gap-4 rounded-lg border-4 border-dashed p-6 transition-colors ${
                                dragging
                                    ? "border-accent"
                                    : "border-border-light dark:border-border-dark"
                            }`}>
                            <Upload className="h-8 w-8 text-light-700 dark:text-dark-700" />
                            <span className="text-xl font-semibold tracking-tight text-light-700 dark:text-dark-700">
                                Drag or click to upload a .json file here
                            </span>
                        </span>
                        <input
                            type="file"
                            accept=".json,application/json"
                            className="sr-only"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void uploadResume(file);
                            }}
                        />
                    </label>
                </div>

                {error && (
                    <p
                        role="alert"
                        className="mt-3 text-center text-sm text-red-600">
                        {error}
                    </p>
                )}
            </Card>
        </div>
    );
}
