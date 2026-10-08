import { useState } from "react";
import { standaloneTypst } from "@typst/standalone-typst";
import { resumeToTypst } from "@typst/resume-to-typst";
import { typst } from "@typst/typst-client";
import ContextMenu from "@components/ui/context-menu";
import { MOD_KEY } from "@components/ui/shortcuts";
import { TOOLBAR_ROW, ToolbarButton } from "@components/ui/toolbar";
import {
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    Download,
    MagnifyingGlass,
} from "@components/ui/icons";
import { useResumeStore } from "@store/useResumeStore";
import {
    MAX_ZOOM,
    MIN_ZOOM,
    ZOOM_PRESETS,
    clampZoom,
    stepZoom,
    type FitMode,
} from "@components/editor/zoom";

interface ViewportToolbarProps {
    pageCount?: number;
    page: number;
    zoom: number;
    onPageSelect: (page: number) => void;
    onZoomChange: (zoom: number) => void;
    fitMode: FitMode | null;
    onFitModeChange: (mode: FitMode | null) => void;
}

type ExportKind = "typ" | "json" | "pdf";

const iconButton =
    "rounded p-1 text-light-800 transition-opacity hover:opacity-70 disabled:opacity-30 dark:text-dark-800";
const zoomBox =
    "h-7 w-14 rounded bg-transparent text-center text-sm text-light-950 outline-none transition-colors hover:bg-light-300 focus:bg-light-50 focus:ring-1 focus:ring-accent dark:text-dark-950 dark:hover:bg-dark-200 dark:focus:bg-dark-100";
const numberBox =
    "rounded-md border-2 border-border-light bg-light-100 px-1 py-0.5 text-center text-light-950 dark:border-border-dark dark:bg-dark-200 dark:text-dark-950";
const exportButton =
    "inline-flex items-center gap-1.5 whitespace-nowrap border-2 px-2 py-0.5 text-sm font-medium text-white/90 transition-opacity hover:opacity-90 disabled:opacity-60";

export default function ViewportToolbar({
    pageCount = 1,
    page,
    zoom,
    onPageSelect,
    onZoomChange,
    fitMode,
    onFitModeChange,
}: ViewportToolbarProps) {
    const [pageDraft, setPageDraft] = useState<string | null>(null);
    const [zoomDraft, setZoomDraft] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
    const [zoomMenuAnchor, setZoomMenuAnchor] = useState<DOMRect | null>(null);

    function commitPage() {
        const next = Math.round(Number(pageDraft));
        if (pageDraft?.trim() && Number.isFinite(next) && pageCount > 0) {
            onPageSelect(Math.min(Math.max(next, 1), pageCount));
        }
        setPageDraft(null);
    }

    function commitZoom() {
        const percent = parseFloat(zoomDraft ?? "");
        if (Number.isFinite(percent)) onZoomChange(clampZoom(percent / 100));
        setZoomDraft(null);
    }

    const resume = useResumeStore((store) => store.resume);
    const [exporting, setExporting] = useState("");
    const [exportError, setExportError] = useState("");

    async function downloadFile(kind: ExportKind) {
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
        // Zoom and page inputs aren't resume edits, so they keep the browser's undo.
        <div data-native-undo>
            <div
                role="toolbar"
                aria-label="Preview"
                className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b-2 border-border-light bg-light-300 px-3 py-1.5 text-sm text-light-800 dark:border-border-dark dark:bg-dark-300 dark:text-dark-800 ${TOOLBAR_ROW}`}>
                <div className="flex items-center gap-1">
                    <ToolbarButton
                        label="Zoom options"
                        hasPopup
                        pressed={Boolean(zoomMenuAnchor)}
                        onClick={(event) =>
                            setZoomMenuAnchor(
                                event.currentTarget.getBoundingClientRect(),
                            )
                        }>
                        <MagnifyingGlass className="h-3.5 w-3.5" />
                        <ChevronDown className="h-2.5 w-2.5" />
                    </ToolbarButton>
                    <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Zoom level"
                        title="Zoom level (pinch to zoom the preview)"
                        data-testid="zoom-level"
                        className={zoomBox}
                        value={zoomDraft ?? `${Math.round(zoom * 100)}%`}
                        onChange={(event) => setZoomDraft(event.target.value)}
                        onFocus={(event) => event.target.select()}
                        onBlur={commitZoom}
                        onKeyDown={(event) => {
                            if (event.key === "Enter")
                                event.currentTarget.blur();
                            if (event.key === "Escape") {
                                setZoomDraft(null);
                                event.currentTarget.blur();
                            }
                        }}
                    />
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        aria-label="Previous page"
                        className={iconButton}
                        disabled={page <= 1}
                        onClick={() => onPageSelect(page - 1)}>
                        <ArrowLeft />
                    </button>
                    <label className="flex items-center gap-1.5 whitespace-nowrap">
                        Page
                        <input
                            type="text"
                            inputMode="numeric"
                            aria-label="Current page"
                            data-testid="page-input"
                            className={`w-9 ${numberBox}`}
                            value={pageDraft ?? String(page)}
                            onChange={(event) =>
                                setPageDraft(event.target.value)
                            }
                            onFocus={(event) => event.target.select()}
                            onBlur={commitPage}
                            onKeyDown={(event) => {
                                if (event.key === "Enter")
                                    event.currentTarget.blur();
                                if (event.key === "Escape") {
                                    setPageDraft(null);
                                    event.currentTarget.blur();
                                }
                            }}
                        />
                        of {pageCount || "…"}
                    </label>
                    <button
                        type="button"
                        aria-label="Next page"
                        className={iconButton}
                        disabled={page >= pageCount}
                        onClick={() => onPageSelect(page + 1)}>
                        <ArrowRight />
                    </button>
                </div>
                <div className="flex justify-end">
                    <button
                        type="button"
                        className={`${exportButton} rounded-l-md border-blue-500/70 bg-accent`}
                        disabled={Boolean(exporting)}
                        onClick={() => void downloadFile("pdf")}>
                        {exporting === "pdf" ? "Rendering…" : "Download PDF"}
                        <Download />
                    </button>
                    <button
                        type="button"
                        aria-label="More download options"
                        aria-haspopup="menu"
                        aria-expanded={Boolean(menuAnchor)}
                        className={`${exportButton} rounded-r-md border-l-0 border-blue-500/70 bg-accent`}
                        disabled={Boolean(exporting)}
                        onClick={(event) =>
                            setMenuAnchor(
                                event.currentTarget.getBoundingClientRect(),
                            )
                        }>
                        <ChevronDown />
                    </button>
                </div>
            </div>
            {exportError && (
                <p
                    role="alert"
                    className="px-3 py-1 text-right text-sm text-red-600">
                    {exportError}
                </p>
            )}
            {zoomMenuAnchor && (
                <ContextMenu
                    label="Zoom options"
                    x={zoomMenuAnchor.left}
                    y={zoomMenuAnchor.bottom + 4}
                    onClose={() => setZoomMenuAnchor(null)}
                    items={[
                        {
                            label: "Zoom in",
                            shortcut: `${MOD_KEY}+`,
                            disabled: zoom >= MAX_ZOOM,
                            onSelect: () => onZoomChange(stepZoom(zoom, 1)),
                        },
                        {
                            label: "Zoom out",
                            shortcut: `${MOD_KEY}−`,
                            disabled: zoom <= MIN_ZOOM,
                            onSelect: () => onZoomChange(stepZoom(zoom, -1)),
                        },
                        {
                            label: "Reset zoom",
                            shortcut: `${MOD_KEY}0`,
                            onSelect: () => onZoomChange(1),
                        },
                        {
                            label: "Fit to width",
                            checked: fitMode === "width",
                            onSelect: () => onFitModeChange("width"),
                            separatorBefore: true,
                        },
                        {
                            label: "Fit to height",
                            checked: fitMode === "height",
                            onSelect: () => onFitModeChange("height"),
                        },
                        ...ZOOM_PRESETS.map((preset, index) => ({
                            label: `${preset * 100}%`,
                            checked: !fitMode && zoom === preset,
                            onSelect: () => onZoomChange(preset),
                            separatorBefore: index === 0,
                        })),
                    ]}
                />
            )}
            {menuAnchor && (
                <ContextMenu
                    label="Download options"
                    x={menuAnchor.left}
                    y={menuAnchor.bottom + 4}
                    onClose={() => setMenuAnchor(null)}
                    items={[
                        {
                            label: "Download PDF",
                            onSelect: () => void downloadFile("pdf"),
                        },
                        {
                            label: "Export .typ",
                            onSelect: () => void downloadFile("typ"),
                        },
                        {
                            label: "Export .json",
                            onSelect: () => void downloadFile("json"),
                        },
                    ]}
                />
            )}
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
