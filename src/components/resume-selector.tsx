import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "@components/ui/button";
import Card from "@components/ui/card";
import ResumeLibrary from "./resume-library";
import RepositoryPicker from "./repository-picker";
import { Upload } from "@components/ui/icons";
import { parseResume } from "@resume/parse-resume";
import { useResumeStore } from "@store/useResumeStore";

export default function ResumeSelector() {
    const navigate = useNavigate();
    const newResume = useResumeStore((store) => store.newResume);
    const load = useResumeStore((store) => store.load);
    const [error, setError] = useState("");

    async function uploadResume(file: File) {
        try {
            load(parseResume(JSON.parse(await file.text())), null);
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
                    Start a new resume or upload an existing resume or
                    <br />
                    sign in with GitHub to access your library of resumes
                </p>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Card
                        variant="elevated"
                        className="flex flex-col items-center justify-center gap-6 rounded-xl p-10">
                        <p className="text-center text-2xl font-semibold tracking-tight text-light-950 dark:text-dark-950">
                            Start a new resume!
                        </p>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                                newResume();
                                navigate("/editor");
                            }}>
                            Start editing
                        </Button>
                    </Card>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-4 border-dashed border-border-light p-10 text-center transition-opacity hover:opacity-80 dark:border-border-dark">
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
