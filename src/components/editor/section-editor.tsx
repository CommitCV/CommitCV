import type { TSectionPath } from "@resume/edit-resume";
import type { ISection } from "@resume/resume";
import { useResumeStore } from "@store/useResumeStore";
import Button from "@components/ui/button";
import { ChevronDown, Plus, Trash } from "@components/ui/icons";
import ContentRow from "./content-row";

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

    return (
        <article
            data-testid={`section-editor-${path.join("-")}`}
            className="overflow-hidden rounded-lg border border-border-light bg-light-200 dark:border-border-dark dark:bg-dark-100">
            <div className="flex items-center gap-2 border-b border-border-light px-3 py-2 dark:border-border-dark">
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
                <button
                    type="button"
                    aria-label={section.title || "Untitled section"}
                    aria-expanded={expanded}
                    onClick={() => setExpanded(path, !expanded)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="truncate font-semibold text-light-950 dark:text-dark-950">
                        {section.type === "header" ? "Header" : "Section"}
                    </span>
                    <ChevronDown
                        className={`h-4 w-4 text-light-700 transition-transform dark:text-dark-700 ${
                            expanded ? "rotate-180" : ""
                        }`}
                    />
                </button>
                {isRoot && (
                    <>
                        <button
                            type="button"
                            aria-label="Move section up"
                            onClick={() => moveSection(path, -1)}
                            className="text-xs text-light-700 hover:text-accent dark:text-dark-700">
                            ↑
                        </button>
                        <button
                            type="button"
                            aria-label="Move section down"
                            onClick={() => moveSection(path, 1)}
                            className="text-xs text-light-700 hover:text-accent dark:text-dark-700">
                            ↓
                        </button>
                    </>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${section.title || "nested section"}`}
                    className="px-1.5 text-red-600"
                    onClick={() => removeSection(path)}>
                    <Trash className="h-4 w-4" />
                </Button>
            </div>

            {!expanded && section.type !== "header" && (
                <label className="flex items-center gap-2 px-3 pb-2 text-sm font-medium text-light-950 dark:text-dark-950">
                    <span className="shrink-0">Header:</span>
                    <input
                        aria-label={`${section.title || "Section"} heading`}
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

            {expanded && (
                <div className="space-y-3 px-3 pb-3 pt-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-light-950 dark:text-dark-950">
                        <span className="w-16 shrink-0">
                            {section.type === "header" ? "Name" : "Heading"}
                        </span>
                        <input
                            aria-label={
                                section.type === "header"
                                    ? "Resume name"
                                    : "Section heading"
                            }
                            value={section.title}
                            onChange={(event) =>
                                updateSection(path, {
                                    title: event.target.value,
                                })
                            }
                            className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-1 font-normal outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200"
                        />
                    </label>

                    <div className="space-y-2">
                        {section.content.map((text, index) => (
                            <ContentRow
                                key={`${path.join(".")}-${index}`}
                                value={text.text}
                                flags={text.flags}
                                onChange={(value) =>
                                    updateText(path, index, { text: value })
                                }
                                onToggleFlags={(flags, value) =>
                                    updateText(path, index, {
                                        flags,
                                        text: value,
                                    })
                                }
                                onRemove={() => removeText(path, index)}
                            />
                        ))}
                    </div>
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
        </article>
    );
}
