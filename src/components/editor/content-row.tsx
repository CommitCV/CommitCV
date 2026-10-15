import type { TSectionPath } from "@resume/edit-resume";
import type { TFlag } from "@resume/resume";
import { useResumeStore } from "@store/useResumeStore";
import { Bullet, Bars, Trash } from "@components/ui/icons";
import Button from "@components/ui/button";
import { useDropZone } from "@hooks/useDropZone";
import DropLine from "./drop-line";
import { useDraggable } from "@hooks/useDraggable";
import FormattedText from "./formatted-text";

interface ContentRowProps {
    path: TSectionPath;
    index: number;
    value: string;
    flags: TFlag[];
    onChange: (value: string) => void;
    onRemove: () => void;
    onSelectionChange: (
        selection: { start: number; end: number } | null,
    ) => void;
}

export default function ContentRow({
    path,
    index,
    value,
    flags,
    onChange,
    onRemove,
    onSelectionChange,
}: ContentRowProps) {
    const isList = flags.includes("bullet");
    const textMode = useResumeStore((store) => store.textMode);
    const reportSelection = (input: HTMLInputElement) =>
        onSelectionChange({
            start: input.selectionStart ?? 0,
            end: input.selectionEnd ?? 0,
        });
    const { active, handlers } = useDropZone(
        (position) => ({
            kind: "text",
            path,
            index,
            position: position === "after" ? "after" : "before",
        }),
        (ratio, item) =>
            item.kind === "text" ? (ratio < 0.5 ? "before" : "after") : null,
    );

    const draggable = useDraggable({ kind: "text", path, index });

    return (
        <div
            {...draggable}
            {...handlers}
            className="relative flex cursor-grab items-start gap-2 rounded active:cursor-grabbing">
            {/* Rows sit in a space-y-2 list: 4px to the gap's middle. */}
            <DropLine
                position={active}
                outset={4}
            />
            <span
                title={isList ? "List item" : "Text"}
                className="flex w-6 shrink-0 items-center pt-1.5 text-light-950 dark:text-dark-950">
                {isList ? (
                    <Bullet className="h-3.5 w-3.5" />
                ) : (
                    <Bars className="h-3.5 w-3.5" />
                )}
            </span>
            {textMode === "formatted" ? (
                <FormattedText
                    value={value}
                    flags={flags}
                    onChange={onChange}
                    onSelectionChange={onSelectionChange}
                />
            ) : (
                <input
                    aria-label="Resume text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onFocus={(event) => reportSelection(event.currentTarget)}
                    onSelect={(event) => reportSelection(event.currentTarget)}
                    onBlur={() => onSelectionChange(null)}
                    className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-1 text-sm text-light-950 outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200 dark:text-dark-950"
                />
            )}
            <Button
                type="button"
                aria-label="Remove text"
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 hover:text-red-600 dark:hover:text-red-500"
                onClick={onRemove}>
                <Trash className="h-4 w-4" />
            </Button>
        </div>
    );
}
