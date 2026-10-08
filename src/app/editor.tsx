import EditorToolbar from "@components/editor/editor-toolbar";
import FormatToolbar from "@components/editor/format-toolbar";
import ViewportToolbar from "@components/editor/viewport-toolbar";
import Header from "@components/header";
import SectionEditor from "@components/editor/section-editor";
import ResumePreview from "@components/editor/resume-preview";
import { useEffect, useState } from "react";
import { useResumeStore } from "@store/useResumeStore";

export default function Editor() {
    const resume = useResumeStore((store) => store.resume);
    const newResume = useResumeStore((store) => store.newResume);
    const [pageCount, setPageCount] = useState(1);
    const [page, setPage] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [jump, setJump] = useState({ page: 1, id: 0 });

    useEffect(() => {
        if (!resume) newResume();
    }, [newResume, resume]);

    if (!resume) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                Loading editor…
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-light-100 text-light-950 dark:bg-dark-100 dark:text-dark-950">
            <Header />
            <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 lg:flex-row lg:p-6">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-2 border-border-light bg-light-50 dark:border-border-dark dark:bg-dark-300">
                    <EditorToolbar />
                    <FormatToolbar />
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                        {resume.sections.map((section, index) => (
                            <div key={index}>
                                <SectionEditor
                                    section={section}
                                    path={[index]}
                                    isRoot
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                    <ViewportToolbar
                        pageCount={pageCount}
                        page={page}
                        zoom={zoom}
                        onZoomChange={setZoom}
                        onPageSelect={(target) => {
                            setPage(target);
                            setJump((prev) => ({
                                page: target,
                                id: prev.id + 1,
                            }));
                        }}
                    />
                    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border-2 border-border-light dark:border-border-dark">
                        <ResumePreview
                            resume={resume}
                            onPageCount={setPageCount}
                            zoom={zoom}
                            jump={jump}
                            onVisiblePageChange={setPage}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
