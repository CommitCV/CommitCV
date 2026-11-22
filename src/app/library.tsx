import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@components/header";
import Footer from "@components/footer";
import BackupNotice from "@components/library/backup-notice";
import RemoteResumes from "@components/library/remote-resumes";
import ResumeCard from "@components/library/resume-card";
import { saveJson } from "@components/save-blob";
import Button from "@components/ui/button";
import { Download, Plus, Upload } from "@components/ui/icons";
import { exportResume, type ExportKind } from "@resume/export-resume";
import { importResumeFile } from "@resume/import-resume-file";
import { sortEntries } from "@resume/library-entries";
import type { IResumeEntry } from "@storage/resume-storage";
import { requestPersistence } from "@storage/persistence";
import { resumeStorages, useResumeStore } from "@store/useResumeStore";

const message = (reason: unknown, fallback: string) =>
    reason instanceof Error ? reason.message : fallback;

export default function Library() {
    const navigate = useNavigate();
    const load = useResumeStore((store) => store.load);
    const newResume = useResumeStore((store) => store.newResume);
    const [entries, setEntries] = useState<IResumeEntry[]>();
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        try {
            setEntries(sortEntries(await resumeStorages.local.list()));
        } catch (reason) {
            setError(message(reason, "Unable to load library"));
            setEntries([]);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        resumeStorages.local
            .list()
            .then((all) => mounted && setEntries(sortEntries(all)))
            .catch((reason: unknown) => {
                if (!mounted) return;
                setError(message(reason, "Unable to load library"));
                setEntries([]);
            });
        return () => {
            mounted = false;
        };
    }, []);

    async function run(action: () => Promise<void>, fallback: string) {
        setError("");
        try {
            await action();
        } catch (reason) {
            setError(message(reason, fallback));
        }
    }

    const open = (id: string) =>
        run(async () => {
            load(await resumeStorages.local.load(id), { kind: "local", id });
            navigate("/editor");
        }, "Unable to open resume");

    const exportOne = (id: string, kind: ExportKind) =>
        run(async () => {
            await exportResume(await resumeStorages.local.load(id), kind);
        }, "Unable to download resume");

    const downloadAll = () =>
        run(async () => {
            const resumes = await Promise.all(
                (entries ?? []).map((entry) =>
                    resumeStorages.local.load(entry.id),
                ),
            );
            saveJson("commitcv-library.json", resumes);
        }, "Unable to download library");

    const remove = (id: string) =>
        run(async () => {
            await resumeStorages.local.remove(id);
            await refresh();
        }, "Unable to delete resume");

    // Saved straight away so the new resume is in the library even if untouched.
    const createResume = () =>
        run(async () => {
            newResume();
            await useResumeStore.getState().save();
            navigate("/editor");
        }, "Unable to create resume");

    const importFile = (file: File) =>
        run(async () => {
            const resume = await importResumeFile(file);
            const id = crypto.randomUUID();
            await resumeStorages.local.save(id, resume);
            void requestPersistence();
            load(resume, { kind: "local", id });
            navigate("/editor");
        }, "Invalid resume file");

    return (
        <div className="flex min-h-screen flex-col bg-light-100 text-light-950 dark:bg-dark-300 dark:text-dark-950">
            <Header />
            <main className="mx-auto w-full max-w-screen-xl flex-1 space-y-6 px-8 py-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-4xl font-bold tracking-tight">
                        Resume Library
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                                void createResume();
                            }}>
                            <Plus className="mr-2 h-4 w-4" />
                            New resume
                        </Button>
                        <label className="inline-flex cursor-pointer items-center rounded-md border-2 border-border-light bg-light-200 px-5 py-2 font-semibold focus-within:ring-2 hover:opacity-90 dark:border-border-dark dark:bg-dark-100">
                            <Upload className="mr-2 h-4 w-4" />
                            Import JSON
                            <input
                                type="file"
                                accept=".json,application/json"
                                className="sr-only"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = "";
                                    if (file) void importFile(file);
                                }}
                            />
                        </label>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={!entries?.length}
                            onClick={() => void downloadAll()}>
                            <Download className="mr-2 h-4 w-4" />
                            Download all
                        </Button>
                    </div>
                </div>

                <BackupNotice />

                {error && (
                    <p
                        role="alert"
                        className="text-sm text-red-600">
                        {error}
                    </p>
                )}

                <h2 className="text-2xl font-bold tracking-tight">
                    Local resume library
                </h2>

                {entries?.length === 0 && (
                    <div
                        data-testid="library-empty"
                        className="flex flex-col items-center gap-4 rounded-md border-4 border-dashed border-border-light p-12 text-center dark:border-border-dark">
                        <p className="text-lg text-light-700 dark:text-dark-700">
                            No saved resumes yet.
                        </p>
                        <Button
                            type="button"
                            onClick={() => {
                                void createResume();
                            }}>
                            New resume
                        </Button>
                    </div>
                )}

                {!!entries?.length && (
                    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {entries.map((entry) => (
                            <ResumeCard
                                key={entry.id}
                                entry={entry}
                                onOpen={(id) => void open(id)}
                                onExport={(id, kind) =>
                                    void exportOne(id, kind)
                                }
                                onDelete={(id) => void remove(id)}
                            />
                        ))}
                    </ul>
                )}

                <RemoteResumes />
            </main>
            <Footer />
        </div>
    );
}
