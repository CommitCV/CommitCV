import { useCallback, useEffect, useRef, useState } from "react";
import { sectionAt, type TSectionPath } from "@resume/edit-resume";
import { useShallow } from "zustand/react/shallow";
import type { ISection, TSectionType } from "@resume/resume";
import { useResumeStore } from "@store/useResumeStore";
import Button from "@components/ui/button";
import {
    AlignJustify,
    ChevronDown,
    Plus,
    Table,
    TableColumns,
    Trash,
} from "@components/ui/icons";
import ContentRow from "./content-row";
import ContextMenu from "@components/ui/context-menu";
import { NEST_HIGHLIGHT, useDropZone } from "@hooks/useDropZone";
import DropLine from "./drop-line";
import { useDraggable } from "@hooks/useDraggable";

/** How long a drag must hover a closed section's middle before it opens. */
const SPRING_OPEN_MS = 600;
/** How long a drag must stay outside a section it opened before it closes. */
const SPRING_CLOSE_MS = 800;

const LAYOUTS = [
    { base: "full-text", label: "Full text", Icon: AlignJustify },
    { base: "two-split", label: "Split", Icon: TableColumns },
    { base: "four-text-split", label: "Text split", Icon: Table },
] as const;

interface SectionEditorProps {
    section: ISection;
    path: TSectionPath;
    isRoot?: boolean;
}

export default function SectionEditor({
    section,
    path,
    isRoot = false,
}: SectionEditorProps) {
    const expanded = useResumeStore(
        (store) =>
            store.expanded[path.join(".")] ??
            (!isRoot || section.type === "header"),
    );
    const setExpanded = useResumeStore((store) => store.setExpanded);
    const updateSection = useResumeStore((store) => store.updateSection);
    const updateText = useResumeStore((store) => store.updateText);
    const addText = useResumeStore((store) => store.addText);
    const removeText = useResumeStore((store) => store.removeText);
    const addSection = useResumeStore((store) => store.addSection);
    const removeSection = useResumeStore((store) => store.removeSection);
    const moveSection = useResumeStore((store) => store.moveSection);
    const setFocusedText = useResumeStore((store) => store.setFocusedText);
    const isHeader = section.type === "header";
    // Top third drops before, bottom third after, the middle nests inside.
    // Text dropped anywhere on the bar is appended to this section.
    const { active, handlers } = useDropZone(
        (position) => ({ kind: "section", path, position }),
        (ratio, item) =>
            item.kind === "text"
                ? "inside"
                : ratio < 1 / 3
                  ? "before"
                  : ratio > 2 / 3
                    ? "after"
                    : "inside",
    );
    const draggable = useDraggable({ kind: "section", path }, !isHeader);

    // Reordering lives in a right-click menu. The header stays first, so it
    // has no menu and nothing moves above it.
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const closeMenu = useCallback(() => setMenu(null), []);
    const [layoutMenu, setLayoutMenu] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const closeLayoutMenu = useCallback(() => setLayoutMenu(null), []);
    // Nested sections keep their `sub-` prefix when the layout changes.
    const subPrefix = section.type.startsWith("sub-") ? "sub-" : "";
    const layout =
        LAYOUTS.find(({ base }) => section.type.endsWith(base)) ?? LAYOUTS[0];
    const index = path[path.length - 1];
    const { canMoveUp, canMoveDown } = useResumeStore(
        useShallow((store) => {
            const parent = path.slice(0, -1);
            const siblings =
                parent.length === 0
                    ? (store.resume?.sections ?? [])
                    : (sectionAt(store.resume!, parent)?.subsections ?? []);
            return {
                canMoveUp: index > 0 && siblings[index - 1]?.type !== "header",
                canMoveDown: index < siblings.length - 1,
            };
        }),
    );

    // Spring-loaded: hovering a drag over a closed section opens it, so the
    // item can be placed among its contents instead of only appended. If the
    // drag then stays away from the section for a while, it closes again.
    const pathKey = path.join(".");
    const dragging = useResumeStore((store) => store.dragItem !== null);
    const targetInside = useResumeStore((store) => {
        const key = store.dropTarget?.path.join(".");
        return (
            key !== undefined &&
            (key === pathKey || key.startsWith(`${pathKey}.`))
        );
    });
    const springOpened = useRef(false);
    const springOpen = active === "inside" && !expanded;
    useEffect(() => {
        if (!springOpen) return;
        const timer = setTimeout(() => {
            springOpened.current = true;
            setExpanded(pathKey.split(".").map(Number), true);
        }, SPRING_OPEN_MS);
        return () => clearTimeout(timer);
    }, [springOpen, pathKey, setExpanded]);
    useEffect(() => {
        // Whatever the drag opened stays open once it ends.
        if (!dragging) springOpened.current = false;
        if (!springOpened.current || !expanded || targetInside) return;
        const timer = setTimeout(() => {
            springOpened.current = false;
            setExpanded(pathKey.split(".").map(Number), false);
        }, SPRING_CLOSE_MS);
        return () => clearTimeout(timer);
    }, [dragging, expanded, targetInside, pathKey, setExpanded]);

    return (
        <article
            data-testid={`section-editor-${path.join("-")}`}
            data-section-path={pathKey}
            {...draggable}
            onContextMenu={(event) => {
                const target = event.target as Element;
                // Other inputs keep the browser's menu (copy, paste, spelling),
                // but the heading input fills most of a collapsed section's
                // bar, so it opens the section menu.
                const isHeading = target.matches(
                    'input[aria-label="Section heading"]',
                );
                if (
                    isHeader ||
                    target.closest("[data-section-path]") !==
                        event.currentTarget ||
                    (!isHeading &&
                        target.closest("input, textarea, [contenteditable]"))
                ) {
                    return;
                }
                event.preventDefault();
                setMenu({ x: event.clientX, y: event.clientY });
            }}
            className={`relative rounded-lg ${isHeader ? "" : "cursor-grab active:cursor-grabbing"} border border-border-light bg-light-200 dark:border-border-dark dark:bg-dark-100`}>
            {/* Half the list gap (space-y-3 at the root, space-y-2 nested) plus the 1px border. */}
            <DropLine
                position={active}
                outset={(isRoot ? 6 : 4) + 1}
            />
            <div
                {...handlers}
                className={`flex items-center gap-2 px-3 py-2 ${
                    expanded
                        ? "rounded-t-lg border-b border-border-light dark:border-border-dark"
                        : "rounded-lg"
                } ${active === "inside" ? NEST_HIGHLIGHT : ""}`}>
                <button
                    type="button"
                    aria-label={
                        section.toggled ? "Disable section" : "Enable section"
                    }
                    aria-pressed={section.toggled}
                    onClick={() =>
                        updateSection(path, { toggled: !section.toggled })
                    }
                    className={`h-5 w-9 rounded-full p-0.5 ${
                        section.toggled ? "bg-green-500" : "bg-red-400"
                    }`}>
                    <span
                        className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                            section.toggled ? "translate-x-4" : ""
                        }`}
                    />
                </button>
                {isHeader ? (
                    <span className="min-w-0 flex-1 truncate font-semibold text-light-950 dark:text-dark-950">
                        Header
                    </span>
                ) : !isRoot ? (
                    // Nested sections print no title, so there's nothing to edit.
                    <span className="min-w-0 flex-1" />
                ) : (
                    <input
                        aria-label="Section heading"
                        value={section.title}
                        onChange={(event) =>
                            updateSection(path, {
                                title: event.target.value,
                            })
                        }
                        className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-1 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200"
                    />
                )}
                {!isHeader && (
                    <button
                        type="button"
                        aria-label="Section layout"
                        aria-haspopup="menu"
                        title={`Layout: ${layout.label}`}
                        onClick={(event) => {
                            const rect =
                                event.currentTarget.getBoundingClientRect();
                            setLayoutMenu({ x: rect.left, y: rect.bottom + 4 });
                        }}
                        className="mr-1 flex items-center gap-1 rounded border border-border-light bg-light-100 px-1.5 py-1 text-light-800 hover:bg-light-300 dark:border-border-dark dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300">
                        <layout.Icon className="h-3.5 w-3.5" />
                        <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                )}
                <button
                    type="button"
                    aria-label={section.title || "Untitled section"}
                    aria-expanded={expanded}
                    onClick={() => setExpanded(path, !expanded)}
                    className="p-1">
                    <ChevronDown
                        className={`h-4 w-4 text-light-700 transition-transform dark:text-dark-700 ${
                            expanded ? "rotate-180" : ""
                        }`}
                    />
                </button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${section.title || "nested section"}`}
                    className="px-1.5 hover:text-red-600 dark:hover:text-red-500"
                    onClick={() => removeSection(path)}>
                    <Trash className="h-4 w-4" />
                </Button>
            </div>

            {expanded && (
                <div className="space-y-3 px-3 pb-3 pt-3">
                    {isHeader && (
                        <label className="flex items-center gap-2 text-sm font-medium text-light-950 dark:text-dark-950">
                            <span className="w-16 shrink-0">Name</span>
                            <input
                                aria-label="Resume name"
                                value={section.title}
                                onChange={(event) =>
                                    updateSection(path, {
                                        title: event.target.value,
                                    })
                                }
                                className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-1 font-normal outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200"
                            />
                        </label>
                    )}

                    {section.content.length > 0 && (
                        <div className="space-y-2">
                            {section.content.map((text, index) => (
                                <ContentRow
                                    key={`${path.join(".")}-${index}`}
                                    path={path}
                                    index={index}
                                    value={text.text}
                                    flags={text.flags}
                                    onChange={(value) =>
                                        updateText(path, index, { text: value })
                                    }
                                    onRemove={() => removeText(path, index)}
                                    onSelectionChange={(selection) =>
                                        setFocusedText(
                                            selection && {
                                                path,
                                                index,
                                                ...selection,
                                            },
                                        )
                                    }
                                />
                            ))}
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-light-700 dark:text-dark-700"
                        onClick={() =>
                            addText(path, {
                                text: "",
                                flags: [],
                                toggled: true,
                            })
                        }>
                        <Plus className="h-4 w-4" />
                        Add text
                    </Button>

                    {section.subsections.length > 0 && (
                        <div className="space-y-2">
                            {section.subsections.map((child, index) => (
                                <SectionEditor
                                    key={`${path.join(".")}-${index}`}
                                    section={child}
                                    path={[...path, index]}
                                />
                            ))}
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-light-700 dark:text-dark-700"
                        onClick={() =>
                            addSection(path, {
                                title: "New item",
                                type: "sub-full-text",
                                toggled: true,
                                content: [],
                                subsections: [],
                            })
                        }>
                        <Plus className="h-4 w-4" />
                        Add nested section
                    </Button>
                </div>
            )}
            {layoutMenu && (
                <ContextMenu
                    label="Section layout"
                    x={layoutMenu.x}
                    y={layoutMenu.y}
                    onClose={closeLayoutMenu}
                    items={LAYOUTS.map(({ base, label }) => ({
                        label,
                        checked: base === layout.base,
                        onSelect: () =>
                            updateSection(path, {
                                type: `${subPrefix}${base}` as TSectionType,
                            }),
                    }))}
                />
            )}
            {menu && (
                <ContextMenu
                    label={`${section.title || "Section"} actions`}
                    x={menu.x}
                    y={menu.y}
                    onClose={closeMenu}
                    items={[
                        {
                            label: "Move up",
                            disabled: !canMoveUp,
                            onSelect: () => moveSection(path, -1),
                        },
                        {
                            label: "Move down",
                            disabled: !canMoveDown,
                            onSelect: () => moveSection(path, 1),
                        },
                    ]}
                />
            )}
        </article>
    );
}
