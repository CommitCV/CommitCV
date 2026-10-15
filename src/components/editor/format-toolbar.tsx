import { useEffect } from "react";
import { flushSync } from "react-dom";
import type { TFlag } from "@resume/resume";
import { sectionAt, type TSectionPath } from "@resume/edit-resume";
import {
    INLINE_MARKERS,
    inlineStylesAt,
    toggleInlineStyle,
    toggleLineFlag,
    wrapSelection,
} from "@resume/format-text";
import {
    Bold,
    Bullet,
    Italic,
    Link,
    LinkSlash,
    Plus,
    Redo,
    Underline,
    Undo,
} from "@components/ui/icons";
import { MOD_KEY, MOD_SHIFT_KEY } from "@components/ui/shortcuts";
import {
    SegmentedControl,
    TOOLBAR_SUBROW,
    ToolbarButton,
    ToolbarDivider,
} from "@components/ui/toolbar";
import {
    useResumeStore,
    type IFocusedText,
    type TTextMode,
} from "@store/useResumeStore";

const EXEC_COMMANDS: Partial<Record<TFlag, string>> = {
    bold: "bold",
    italics: "italic",
    underline: "underline",
};

const SHORTCUTS: Record<string, TFlag> = {
    b: "bold",
    i: "italics",
    u: "underline",
};

// Actions read the store directly so the buttons and the keyboard
// shortcuts share them without re-subscribing.
function focusedText() {
    const { resume, focusedText: focused } = useResumeStore.getState();
    const text =
        resume && focused
            ? sectionAt(resume, focused.path)?.content[focused.index]
            : undefined;
    if (!focused || !text) return null;
    // A raw input's live selection beats the stored one, whose `select`
    // event can land after a quick shortcut.
    const input = document.activeElement;
    if (input instanceof HTMLInputElement && input.value === text.text) {
        return {
            focused: {
                ...focused,
                start: input.selectionStart ?? focused.start,
                end: input.selectionEnd ?? focused.end,
            },
            text,
        };
    }
    // A formatted field's live selection likewise beats the stored one, so a
    // selection the field hasn't reported yet isn't mistaken for a caret.
    const field = document.activeElement;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (
        field instanceof HTMLElement &&
        field.getAttribute("role") === "textbox" &&
        range &&
        field.contains(range.startContainer)
    ) {
        const before = document.createRange();
        before.selectNodeContents(field);
        before.setEnd(range.startContainer, range.startOffset);
        const start = before.toString().length;
        return {
            focused: {
                ...focused,
                start,
                end: start + range.toString().length,
            },
            text,
        };
    }
    return { focused, text };
}

/**
 * Writes a raw field's new markup and keeps the same text selected.
 * Rendering synchronously lets the selection be restored before the
 * next keypress, so a quick second shortcut sees it.
 */
function editRawText(
    input: Element | null,
    focused: IFocusedText,
    next: { text: string; start: number; end: number },
) {
    flushSync(() =>
        useResumeStore
            .getState()
            .updateText(focused.path, focused.index, { text: next.text }),
    );
    if (input instanceof HTMLInputElement) {
        input.focus();
        input.setSelectionRange(next.start, next.end);
    }
}

/**
 * Styles the selection, or toggles the whole-line flag when nothing is
 * selected. Formatted fields style the selection in place; raw fields
 * rewrite their markup.
 */
function format(flag: TFlag) {
    const target = focusedText();
    if (!target) return;
    const { focused, text } = target;
    const { textMode, updateText } = useResumeStore.getState();
    const marker = INLINE_MARKERS[flag];
    const hasSelection = focused.start !== focused.end;
    // A caret inside styled text toggles that styled span, not the line.
    const inStyledText =
        !hasSelection &&
        !text.flags.includes(flag) &&
        activeInlineStyles(textMode, text.text, focused).includes(flag);
    if (marker && (hasSelection || inStyledText)) {
        if (textMode === "formatted") {
            if (inStyledText) selectStyledElement(flag);
            // The field's input handler writes the result back as markup.
            document.execCommand(EXEC_COMMANDS[flag]!);
            return;
        }
        const next = toggleInlineStyle(
            text.text,
            focused.start,
            focused.end,
            flag,
        );
        editRawText(document.activeElement, focused, next);
        return;
    }
    updateText(focused.path, focused.index, toggleLineFlag(text, flag));
}

const STYLE_TAGS: Partial<Record<TFlag, string>> = {
    bold: "b, strong",
    italics: "i, em",
    underline: "u",
};

/** Selects the styled element holding the caret so a command toggles all of it. */
function selectStyledElement(flag: TFlag) {
    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const element = anchor instanceof Element ? anchor : anchor?.parentElement;
    const styled = element?.closest(STYLE_TAGS[flag]!);
    if (!selection || !styled) return;
    const range = document.createRange();
    range.selectNodeContents(styled);
    selection.removeAllRanges();
    selection.addRange(range);
}

const MARKUP_LINK = /\[([^\]]*)\]\([^)]*\)/g;

/** The link under the caret or selection: its DOM anchor, or its raw markup span. */
function linkAtSelection(
    textMode: TTextMode,
    markup: string,
    focused: IFocusedText,
):
    | { anchor: HTMLAnchorElement }
    | { from: number; to: number; label: string }
    | null {
    if (textMode === "formatted") {
        const node = window.getSelection()?.anchorNode;
        const element = node instanceof Element ? node : node?.parentElement;
        const anchor = element?.closest("a");
        return anchor?.closest("[role=textbox]") ? { anchor } : null;
    }
    for (const match of markup.matchAll(MARKUP_LINK)) {
        const from = match.index;
        const to = from + match[0].length;
        if (focused.start >= from && focused.end <= to) {
            return { from, to, label: match[1] };
        }
    }
    return null;
}

/** Replaces the link under the selection with its plain label. */
function removeLink() {
    const target = focusedText();
    if (!target) return;
    const { focused, text } = target;
    const { textMode, updateText } = useResumeStore.getState();
    const link = linkAtSelection(textMode, text.text, focused);
    if (!link) return;
    if ("anchor" in link) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(link.anchor);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand("unlink");
        return;
    }
    const markup = text.text;
    const next =
        markup.slice(0, link.from) + link.label + markup.slice(link.to);
    const input = document.activeElement;
    const end = link.from + link.label.length;
    if (textMode === "raw") {
        editRawText(input, focused, { text: next, start: link.from, end });
    } else {
        updateText(focused.path, focused.index, { text: next });
    }
}

function insertLink() {
    const target = focusedText();
    if (!target) return;
    const { focused, text } = target;
    const { textMode, updateText } = useResumeStore.getState();
    const hasSelection = focused.start !== focused.end;
    // The prompt takes focus, so remember the formatted field's selection.
    const field = document.activeElement;
    const range =
        textMode === "formatted" && hasSelection
            ? window.getSelection()?.getRangeAt(0).cloneRange()
            : undefined;

    const url = window.prompt("Link URL", "https://");
    if (!url) return;

    if (range && field instanceof HTMLElement) {
        field.focus();
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand("createLink", false, url);
        return;
    }
    const next = wrapSelection(
        text.text,
        hasSelection ? focused.start : 0,
        hasSelection ? focused.end : text.text.length,
        "[",
        `](${url})`,
    );
    if (textMode === "raw") editRawText(field, focused, next);
    else updateText(focused.path, focused.index, { text: next.text });
}

/** The section being worked in: the focused text's, else the one holding focus. */
function currentSectionPath(): TSectionPath | null {
    const focused = useResumeStore.getState().focusedText;
    if (focused) return focused.path;
    const section = document.activeElement?.closest<HTMLElement>(
        "[data-section-path]",
    );
    return section ? section.dataset.sectionPath!.split(".").map(Number) : null;
}

/** Focuses an element once React has rendered it. */
function focusWhenRendered(selector: string) {
    requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(selector)?.focus(),
    );
}

/**
 * Adds a section inside the one being worked in, or at the top level when
 * there's none (or it's the header), then opens it and focuses its heading.
 */
function newSection() {
    const { resume, addSection, setExpanded } = useResumeStore.getState();
    if (!resume) return;
    const current = currentSectionPath();
    const parent = current && sectionAt(resume, current);
    const nested = parent && parent.type !== "header" ? current : null;
    const siblings = nested ? parent!.subsections : resume.sections;
    const path = [...(nested ?? []), siblings.length];
    addSection(nested ?? [], {
        title: nested ? "New item" : "New section",
        type: nested ? "sub-full-text" : "full-text",
        toggled: true,
        content: [],
        subsections: [],
    });
    if (nested) setExpanded(nested, true);
    setExpanded(path, true);
    focusWhenRendered(
        `[data-section-path="${path.join(".")}"] [aria-label="Section heading"]`,
    );
}

/**
 * Inline styles at the caret or across the selection, so the buttons
 * light up inside styled text as well as on styled lines.
 */
function activeInlineStyles(
    textMode: TTextMode,
    markup: string,
    focused: IFocusedText,
): TFlag[] {
    if (textMode === "raw") {
        return inlineStylesAt(markup, focused.start, focused.end);
    }
    return (Object.keys(EXEC_COMMANDS) as TFlag[]).filter((flag) =>
        document.queryCommandState(EXEC_COMMANDS[flag]!),
    );
}

export default function FormatToolbar() {
    const text = useResumeStore((store) =>
        store.resume && store.focusedText
            ? sectionAt(store.resume, store.focusedText.path)?.content[
                  store.focusedText.index
              ]
            : undefined,
    );
    const focused = useResumeStore((store) => store.focusedText);
    const textMode = useResumeStore((store) => store.textMode);
    const setTextMode = useResumeStore((store) => store.setTextMode);
    const canUndo = useResumeStore((store) => store.past.length > 0);
    const canRedo = useResumeStore((store) => store.future.length > 0);
    const undo = useResumeStore((store) => store.undo);
    const redo = useResumeStore((store) => store.redo);

    // ⌘/Ctrl+B, I and U style the focused text field.
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (!(event.metaKey || event.ctrlKey)) return;
            if (event.altKey || event.shiftKey) return;
            const flag = SHORTCUTS[event.key.toLowerCase()];
            if (!flag || !focusedText()) return;
            event.preventDefault();
            format(flag);
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    const disabled = !text;
    const inlineStyles =
        text && focused ? activeInlineStyles(textMode, text.text, focused) : [];
    const inLink = Boolean(
        text && focused && linkAtSelection(textMode, text.text, focused),
    );
    const isActive = (flag: TFlag) =>
        Boolean(text?.flags.includes(flag) || inlineStyles.includes(flag));

    return (
        <div
            role="toolbar"
            aria-label="Formatting"
            className={`flex flex-wrap items-center gap-1 border-b-2 border-border-light bg-light-100 px-3 py-1 dark:border-border-dark dark:bg-dark-300 ${TOOLBAR_SUBROW}`}>
            <ToolbarButton
                label="Add section"
                onClick={newSection}>
                <Plus className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Add section</span>
            </ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton
                label="Undo"
                shortcut={`${MOD_KEY}Z`}
                disabled={!canUndo}
                onClick={undo}>
                <Undo className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
                label="Redo"
                shortcut={`${MOD_SHIFT_KEY}Z`}
                disabled={!canRedo}
                onClick={redo}>
                <Redo className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton
                label="Bold"
                shortcut={`${MOD_KEY}B`}
                disabled={disabled}
                pressed={isActive("bold")}
                onClick={() => format("bold")}>
                <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
                label="Italic"
                shortcut={`${MOD_KEY}I`}
                disabled={disabled}
                pressed={isActive("italics")}
                onClick={() => format("italics")}>
                <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
                label="Underline"
                shortcut={`${MOD_KEY}U`}
                disabled={disabled}
                pressed={isActive("underline")}
                onClick={() => format("underline")}>
                <Underline className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
                label="Bullet point"
                disabled={disabled}
                pressed={text?.flags.includes("bullet")}
                onClick={() => format("bullet")}>
                <Bullet className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
                label={inLink ? "Remove link" : "Insert link"}
                disabled={disabled}
                onClick={inLink ? removeLink : insertLink}>
                {inLink ? (
                    <LinkSlash className="h-3.5 w-3.5" />
                ) : (
                    <Link className="h-3.5 w-3.5" />
                )}
            </ToolbarButton>
            <div className="flex-1" />
            <SegmentedControl
                label="Text display"
                value={textMode}
                options={[
                    { value: "formatted", label: "Formatted" },
                    { value: "raw", label: "Raw" },
                ]}
                onChange={setTextMode}
            />
        </div>
    );
}
