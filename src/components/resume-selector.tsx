import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "@components/ui/button";
import { buttonClass } from "@components/ui/button-class";
import Card from "@components/ui/card";
import { Git, Upload } from "@components/ui/icons";
import { importResumeFile } from "@resume/import-resume-file";
import { requestPersistence } from "@storage/persistence";
import { resumeStorages, useResumeStore } from "@store/useResumeStore";
import { trackResumeCreated, trackResumeImported } from "@analytics/tracker";

export default function ResumeSelector() {
    const navigate = useNavigate();
    const newResume = useResumeStore((store) => store.newResume);
    const load = useResumeStore((store) => store.load);
    const [error, setError] = useState("");

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
        <div className="mx-auto w-full max-w-4xl">
            <Card
                variant="surface"
                className="p-6 md:p-8">
                <p className="mb-8 text-center text-lg font-medium text-light-950 dark:text-dark-950">
                    Start a new resume, upload an existing one, or
                    <br />
                    connect a git repository to access your library of resumes
                </p>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card
                        variant="elevated"
                        className="flex flex-col items-center justify-center gap-6 rounded-xl p-8">
                        <p className="text-center text-2xl font-semibold tracking-tight text-light-950 dark:text-dark-950">
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
                    </Card>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-4 border-dashed border-border-light p-8 text-center transition-opacity hover:opacity-80 dark:border-border-dark">
                        <Upload className="h-8 w-8 text-light-700 dark:text-dark-700" />
                        <span className="text-2xl font-semibold tracking-tight text-light-700 dark:text-dark-700">
                            Drag or click to upload a .json file here
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
                    <Card
                        variant="elevated"
                        className="flex flex-col items-center justify-center gap-6 rounded-xl p-8">
                        <p className="text-center text-2xl font-semibold tracking-tight text-light-950 dark:text-dark-950">
                            Use a git repository
                        </p>
                        <Link
                            to="/signin"
                            className={buttonClass("primary", "md", "gap-2")}>
                            <Git className="h-4 w-4" />
                            Connect a repository
                        </Link>
                    </Card>
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
