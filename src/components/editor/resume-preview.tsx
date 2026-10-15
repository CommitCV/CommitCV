import { useEffect, useRef, useState } from "react";
import type { IResume } from "@resume/resume";
import { resumeToTypst } from "@typst/resume-to-typst";
import { typst } from "@typst/typst-client";
import { clampZoom, type FitMode } from "@components/editor/zoom";
import { usePreviewZoom } from "@hooks/usePreviewZoom";

interface ResumePreviewProps {
    resume: IResume;
    onPageCount?: (count: number) => void;
    zoom?: number;
    /** Request to scroll to a page; `id` makes repeat jumps to the same page re-fire. */
    jump?: { page: number; id: number };
    onVisiblePageChange?: (page: number) => void;
    /** Keeps the zoom fitting a page to the viewport, through resizes. */
    fitMode?: FitMode | null;
    onZoomChange?: (zoom: number) => void;
    /** A zoom the user made by pinching or with keys, which ends any fit mode. */
    onPinchZoom?: (zoom: number) => void;
}

/** Matches the `p-6` padding and the 850px page cap below. */
const PADDING = 24;
const BASE_WIDTH = 850;

export default function ResumePreview({
    resume,
    onPageCount,
    zoom = 1,
    jump,
    onVisiblePageChange,
    fitMode,
    onZoomChange,
    onPinchZoom,
}: ResumePreviewProps) {
    const [pages, setPages] = useState<string[]>([]);
    const [error, setError] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    usePreviewZoom(scrollRef, zoom, (next) => onPinchZoom?.(next));

    useEffect(() => {
        if (!jump) return;
        const target = scrollRef.current?.querySelector(
            `[data-testid="preview-page-${jump.page}"]`,
        );
        target?.scrollIntoView({ block: "start" });
    }, [jump]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!fitMode || !container || !onZoomChange) return;
        const applyFit = () => {
            const firstPage = container.querySelector(
                "[data-testid='preview-page-1']",
            );
            if (!firstPage) return;
            const { width, height } = firstPage.getBoundingClientRect();
            const availableWidth = container.clientWidth - PADDING * 2;
            const availableHeight = container.clientHeight - PADDING * 2;
            // Zoom 1 renders the page at min(available width, BASE_WIDTH).
            const baseWidth = Math.min(availableWidth, BASE_WIDTH);
            const fitWidth =
                fitMode === "width"
                    ? availableWidth
                    : availableHeight * (width / height);
            onZoomChange(clampZoom(fitWidth / baseWidth));
        };
        applyFit();
        // The border box ignores scrollbars appearing, so re-fitting can't loop.
        const observer = new ResizeObserver(applyFit);
        observer.observe(container, { box: "border-box" });
        return () => observer.disconnect();
    }, [fitMode, onZoomChange, pages]);

    function handleScroll() {
        const container = scrollRef.current;
        if (!container || !onVisiblePageChange) return;
        const midline =
            container.getBoundingClientRect().top + container.clientHeight / 2;
        const nodes = container.querySelectorAll(
            "[data-testid^='preview-page-']",
        );
        let current = 1;
        nodes.forEach((node, index) => {
            if (node.getBoundingClientRect().top <= midline)
                current = index + 1;
        });
        onVisiblePageChange(current);
    }

    useEffect(() => {
        let active = true;
        const source = resumeToTypst(resume);
        const timer = window.setTimeout(() => {
            typst
                .renderSvg(source)
                .then((nextSvg) => {
                    if (active) {
                        const nextPages = splitSvgPages(nextSvg);
                        setPages(nextPages);
                        onPageCount?.(nextPages.length);
                        setError("");
                    }
                })
                .catch((reason: unknown) => {
                    if (active) {
                        setPages([]);
                        onPageCount?.(0);
                        setError(
                            reason instanceof Error
                                ? reason.message
                                : "Preview failed",
                        );
                    }
                });
        }, 50);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [onPageCount, resume]);

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-testid="resume-preview"
            className="flex h-full touch-pan-x touch-pan-y items-start overflow-auto p-6">
            {pages.length > 0 ? (
                <div
                    className="mx-auto flex shrink-0 flex-col gap-6"
                    style={{ width: `calc(min(100%, 850px) * ${zoom})` }}>
                    {pages.map((page, index) => (
                        <div
                            key={index}
                            data-testid={`preview-page-${index + 1}`}
                            className="bg-white shadow-lg [&_svg]:h-auto [&_svg]:w-full"
                            dangerouslySetInnerHTML={{ __html: page }}
                        />
                    ))}
                </div>
            ) : (
                <p className="m-auto max-w-md text-center text-sm text-light-700 dark:text-dark-700">
                    {error || "Rendering preview…"}
                </p>
            )}
        </div>
    );
}

function splitSvgPages(source: string): string[] {
    const document = new DOMParser().parseFromString(source, "text/html");
    const root = document.querySelector("svg");
    if (!root) return [source];
    const pageNodes = Array.from(root.children).filter((child) =>
        child.classList.contains("typst-page"),
    );
    if (pageNodes.length < 2) return [source];

    const viewBox = (root.getAttribute("viewBox") ?? "")
        .split(/\s+/)
        .map(Number);
    const [width, totalHeight] = [viewBox[2], viewBox[3]];
    if (!width || !totalHeight) return [source];

    const sharedNodes = Array.from(root.children).filter(
        (child) => !child.classList.contains("typst-page"),
    );
    const pageHeight = totalHeight / pageNodes.length;

    return pageNodes.map((pageNode) => {
        const page = root.cloneNode(false) as SVGSVGElement;
        page.setAttribute(
            "viewBox",
            `0 0 ${width.toFixed(3)} ${pageHeight.toFixed(3)}`,
        );
        page.setAttribute("height", pageHeight.toFixed(3));
        page.setAttribute("data-height", pageHeight.toFixed(3));
        for (const sharedNode of sharedNodes) {
            page.appendChild(sharedNode.cloneNode(true));
        }
        const pageContent = pageNode.cloneNode(true) as SVGGElement;
        pageContent.setAttribute("transform", "translate(0, 0)");
        page.appendChild(pageContent);
        return new XMLSerializer().serializeToString(page);
    });
}
