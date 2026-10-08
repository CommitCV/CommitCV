import { useState } from "react";
import Button from "@components/ui/button";
import { standaloneTypst } from "@typst/standalone-typst";
import { resumeToTypst } from "@typst/resume-to-typst";
import { typst } from "@typst/typst-client";
import { Download } from "@components/ui/icons";
import { useResumeStore } from "@store/useResumeStore";

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

interface ViewportToolbarProps {
    pageCount?: number;
    page: number;
    zoom: number;
    onPageSelect: (page: number) => void;
    onZoomChange: (zoom: number) => void;
}

export default function ViewportToolbar({
    pageCount = 1,
    page,
    zoom,
    onPageSelect,
    onZoomChange,
}: ViewportToolbarProps) {
    const [pageDraft, setPageDraft] = useState<string | null>(null);

    function commitPage() {
        const next = Math.round(Number(pageDraft));
        if (pageDraft?.trim() && Number.isFinite(next) && pageCount > 0) {
            onPageSelect(Math.min(Math.max(next, 1), pageCount));
        }
        setPageDraft(null);
    }

    function stepZoom(delta: number) {
        onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)));
    }

    const resume = useResumeStore((store) => store.resume);
    const [exporting, setExporting] = useState("");
    const [exportError, setExportError] = useState("");

    async function downloadFile(kind: "typ" | "json" | "pdf") {
        if (!resume) return;
        setExporting(kind);
        setExportError("");
        try {
            if (kind === "json") {
                saveBlob(
                    `${resume.filename || "resume"}.json`,
                    new Blob([JSON.stringify(resume, null, 4)], {
                        type: "application/json",
                    }),
                );
            } else if (kind === "typ") {
                saveBlob(
                    `${resume.filename || "resume"}.typ`,
                    new Blob([await standaloneTypst(resume)], {
                        type: "text/plain",
                    }),
                );
            } else {
                const pdf = await typst.renderPdf(resumeToTypst(resume));
                const buffer = new ArrayBuffer(pdf.byteLength);
                new Uint8Array(buffer).set(pdf);
                saveBlob(
                    `${resume.filename || "resume"}.pdf`,
                    new Blob([buffer], {
                        type: "application/pdf",
                    }),
                );
            }
        } catch (reason) {
            setExportError(
                reason instanceof Error ? reason.message : "Export failed",
            );
        } finally {
            setExporting("");
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-border-light bg-light-300 px-3 py-1.5 dark:border-border-dark dark:bg-dark-200">
            <label className="flex items-center gap-1.5 text-sm text-light-700 dark:text-dark-700">
                Page
                <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Current page"
                    data-testid="page-input"
                    className="w-10 rounded border border-border-light bg-transparent px-1 py-0.5 text-center dark:border-border-dark"
                    value={pageDraft ?? String(page)}
                    onChange={(event) => setPageDraft(event.target.value)}
                    onFocus={(event) => event.target.select()}
                    onBlur={commitPage}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") {
                            setPageDraft(null);
                            event.currentTarget.blur();
                        }
                    }}
                />
                of {pageCount || "…"}
            </label>
            <div className="flex items-center gap-1 text-sm text-light-700 dark:text-dark-700">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label="Zoom out"
                    disabled={zoom <= MIN_ZOOM}
                    onClick={() => stepZoom(-ZOOM_STEP)}>
                    −
                </Button>
                <button
                    type="button"
                    aria-label="Reset zoom"
                    data-testid="zoom-level"
                    className="w-12 text-center"
                    onClick={() => onZoomChange(1)}>
                    {Math.round(zoom * 100)}%
                </button>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label="Zoom in"
                    disabled={zoom >= MAX_ZOOM}
                    onClick={() => stepZoom(ZOOM_STEP)}>
                    +
                </Button>
            </div>
            <div className="flex-1" />
            {exportError && (
                <p
                    role="alert"
                    className="text-sm text-red-600">
                    {exportError}
                </p>
            )}
            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                disabled={Boolean(exporting)}
                onClick={() => void downloadFile("typ")}>
                Export .typ
                <Download className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                disabled={Boolean(exporting)}
                onClick={() => void downloadFile("json")}>
                Export .json
                <Download className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="primary"
                size="sm"
                className="gap-1.5"
                disabled={Boolean(exporting)}
                onClick={() => void downloadFile("pdf")}>
                {exporting === "pdf" ? "Rendering…" : "Download PDF"}
                <Download className="h-4 w-4" />
            </Button>
        </div>
    );
}

function saveBlob(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
