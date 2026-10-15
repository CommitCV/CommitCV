import { useLayoutEffect, useRef, useState } from "react";
import type { TInlineRun } from "@resume/inline-markup";
import type { TFlag } from "@resume/resume";
import { Link } from "@components/ui/icons";
import { markupToHtml, runsToMarkup } from "@resume/rich-text";

interface FormattedTextProps {
    value: string;
    /** Whole-line flags from the resume JSON, shown as styling. */
    flags: TFlag[];
    onChange: (value: string) => void;
    onSelectionChange: (
        selection: { start: number; end: number } | null,
    ) => void;
}

/**
 * A single-line rich text field over the markup string. It's uncontrolled
 * while typing (re-rendering would reset the caret) and only re-renders
 * its HTML when the value changes from outside, e.g. a toolbar action.
 */
export default function FormattedText({
    value,
    flags,
    onChange,
    onSelectionChange,
}: FormattedTextProps) {
    const ref = useRef<HTMLDivElement>(null);
    const rendered = useRef<string | null>(null);
    // One entry per link; a link split by partial styling has several anchors.
    const [links, setLinks] = useState<
        { anchors: HTMLAnchorElement[]; href: string }[]
    >([]);

    function editHref(index: number, href: string) {
        links[index].anchors.forEach((anchor) =>
            anchor.setAttribute("href", href),
        );
        emit();
    }

    useLayoutEffect(() => {
        const root = ref.current;
        if (!root) return;
        if (value !== rendered.current) {
            root.innerHTML = markupToHtml(value);
            rendered.current = value;
        }
        const groups: typeof links = [];
        root.querySelectorAll("a").forEach((anchor) => {
            const href = anchor.getAttribute("href") ?? "";
            const last = groups[groups.length - 1];
            if (last?.href === href) last.anchors.push(anchor);
            else groups.push({ anchors: [anchor], href });
        });
        setLinks(groups);
    }, [value]);

    function emit() {
        if (!ref.current) return;
        const markup = runsToMarkup(domToRuns(ref.current));
        rendered.current = markup;
        onChange(markup);
    }

    function reportSelection() {
        const root = ref.current;
        const selection = window.getSelection();
        if (!root || !selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!root.contains(range.startContainer)) return;
        // Offsets into the visible text; only used to tell if anything is selected.
        const before = document.createRange();
        before.selectNodeContents(root);
        before.setEnd(range.startContainer, range.startOffset);
        const start = before.toString().length;
        onSelectionChange({ start, end: start + range.toString().length });
    }

    return (
        <div className="min-w-0 flex-1">
            <div
                ref={ref}
                role="textbox"
                aria-label="Resume text"
                tabIndex={0}
                contentEditable
                suppressContentEditableWarning
                onInput={emit}
                onFocus={reportSelection}
                onSelect={reportSelection}
                onKeyUp={reportSelection}
                onMouseUp={reportSelection}
                onBlur={() => onSelectionChange(null)}
                onKeyDown={(event) => {
                    // Text elements are single lines.
                    if (event.key === "Enter") event.preventDefault();
                }}
                onPaste={(event) => {
                    event.preventDefault();
                    const text = event.clipboardData
                        .getData("text/plain")
                        .replace(/\s*\n\s*/g, " ");
                    document.execCommand("insertText", false, text);
                }}
                className={`min-h-[30px] w-full cursor-text whitespace-pre-wrap break-words rounded border border-border-light bg-light-100 px-2 py-1 text-sm text-light-950 outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200 dark:text-dark-950 [&_a]:text-accent [&_a]:underline [&_[data-icon]]:rounded [&_[data-icon]]:bg-light-300 [&_[data-icon]]:px-1 [&_[data-icon]]:font-mono [&_[data-icon]]:text-xs dark:[&_[data-icon]]:bg-dark-300 ${lineStyles(flags)}`}
            />
            {links.map((link, index) => (
                <div
                    key={index}
                    className="mt-1 flex items-center gap-2">
                    <span className="flex shrink-0 items-center pl-2 text-light-950 dark:text-dark-950">
                        <Link className="h-3.5 w-3.5" />
                    </span>
                    <input
                        aria-label="Link URL"
                        value={link.href}
                        onChange={(event) =>
                            editHref(index, event.target.value)
                        }
                        className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-0.5 text-sm text-light-950 outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200 dark:text-dark-950"
                    />
                </div>
            ))}
        </div>
    );
}

function lineStyles(flags: TFlag[]): string {
    return [
        flags.includes("bold") && "font-bold",
        flags.includes("italics") && "italic",
        flags.includes("underline") && "underline",
        flags.includes("strikethrough") && "line-through",
        flags.includes("bigger") && "text-base",
        flags.includes("bullet") && "before:mr-1.5 before:content-['•']",
    ]
        .filter(Boolean)
        .join(" ");
}

const TAG_STYLES: Record<string, TFlag> = {
    B: "bold",
    STRONG: "bold",
    I: "italics",
    EM: "italics",
    U: "underline",
    S: "strikethrough",
    STRIKE: "strikethrough",
    DEL: "strikethrough",
};

/** Reads the field's DOM back into styled runs. */
function domToRuns(root: Node): TInlineRun[] {
    const runs: TInlineRun[] = [];
    const walk = (node: Node, flags: TFlag[], href?: string) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent ?? "";
            if (text) runs.push({ type: "text", text, flags, href });
            return;
        }
        if (!(node instanceof HTMLElement)) return;
        if (node.dataset.icon) {
            runs.push({ type: "icon", name: node.dataset.icon });
            return;
        }
        if (node.tagName === "BR") return;
        const next = new Set(flags);
        const tagStyle = TAG_STYLES[node.tagName];
        if (tagStyle) next.add(tagStyle);
        // Browsers sometimes style with CSS instead of tags.
        const { fontWeight, fontStyle, textDecorationLine } = node.style;
        if (fontWeight === "bold" || Number(fontWeight) >= 600) {
            next.add("bold");
        }
        if (fontStyle === "italic") next.add("italics");
        if (textDecorationLine.includes("underline")) next.add("underline");
        if (textDecorationLine.includes("line-through")) {
            next.add("strikethrough");
        }
        const link =
            node instanceof HTMLAnchorElement
                ? (node.getAttribute("href") ?? undefined)
                : href;
        node.childNodes.forEach((child) => walk(child, [...next], link));
    };
    root.childNodes.forEach((child) => walk(child, []));
    return runs;
}
