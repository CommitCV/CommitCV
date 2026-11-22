import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "@components/ui/button";
import Card from "@components/ui/card";
import ResumeLibrary from "./resume-library";
import RepositoryPicker from "./repository-picker";
import { Upload } from "@components/ui/icons";
import { today } from "@resume/dates";
import { isLegacyResume, migrateLegacyResume } from "@resume/legacy-resume";
import { parseResume } from "@resume/parse-resume";
import { useResumeStore } from "@store/useResumeStore";
import { trackResumeCreated, trackResumeImported } from "@analytics/tracker";

// Choice cards sit on the page background, inside the surface box.
const choiceCard =
    "flex flex-col items-center justify-center rounded-xl border-4 border-border-light bg-light-100 text-center sm:aspect-square dark:border-border-dark dark:bg-dark-300";

export default function ResumeSelector() {
    const navigate = useNavigate();
    const newResume = useResumeStore((store) => store.newResume);
    const load = useResumeStore((store) => store.load);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);

    async function uploadResume(file: File) {
        try {
            const json: unknown = JSON.parse(await file.text());
            const resume = isLegacyResume(json)
                ? migrateLegacyResume(json, {
                      filename: file.name.replace(/\.json$/i, ""),
                      date: today(),
                  })
                : parseResume(json);
            load(resume, null);
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
                <p className="mb-8 text-center text-lg font-medium text-light-950 dark:text-dark-950">
                    Start a new resume or upload an existing resume or
                    <br />
                    sign in with GitHub to access your library of resumes
                </p>

                <div className="mx-auto grid max-w-xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-12">
                    <div className={`${choiceCard} gap-6 p-10`}>
                        <p className="text-xl font-semibold tracking-tight text-light-950 dark:text-dark-950">
                            Start a new resume!
                        </p>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                                newResume();
                                trackResumeCreated();
                                navigate("/editor");
                            }}>
                            Start editing
                        </Button>
                    </div>
                    <label
                        className={`${choiceCard} cursor-pointer p-3 transition-opacity hover:opacity-80 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent`}
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
                            className={`flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border-4 border-dashed p-6 transition-colors ${
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
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <ResumeLibrary compact />
                    <RepositoryPicker />
                </div>
            </Card>
        </div>
    );
}
