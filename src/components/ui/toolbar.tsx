import type { MouseEvent, ReactNode } from "react";

/** Shared row heights so the editor and preview toolbars line up. */
export const TOOLBAR_ROW = "min-h-12";
export const TOOLBAR_SUBROW = "min-h-10";

interface ToolbarButtonProps {
    label: string;
    children: ReactNode;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    pressed?: boolean;
    shortcut?: string;
    hasPopup?: boolean;
}

export function ToolbarButton({
    label,
    children,
    onClick,
    disabled = false,
    pressed,
    shortcut,
    hasPopup,
}: ToolbarButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={shortcut ? `${label} (${shortcut})` : label}
            aria-pressed={pressed}
            aria-haspopup={hasPopup ? "menu" : undefined}
            disabled={disabled}
            // Keep focus (and the selection) in the text field being edited.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={`flex h-7 min-w-7 items-center justify-center gap-1 rounded px-1.5 text-light-950 transition-colors disabled:opacity-40 disabled:hover:bg-transparent dark:text-dark-950 ${
                pressed
                    ? "bg-light-600 dark:bg-dark-500"
                    : "hover:bg-light-300 dark:hover:bg-dark-200"
            }`}>
            {children}
        </button>
    );
}

export function ToolbarDivider() {
    return (
        <div className="mx-1 h-5 w-px bg-border-light dark:bg-border-dark" />
    );
}

interface SegmentedControlProps<T extends string> {
    label: string;
    value: T | null;
    options: { value: T; label: ReactNode; title?: string }[];
    onChange: (value: T) => void;
}

/** A pill of mutually exclusive options; `value` may be null for none. */
export function SegmentedControl<T extends string>({
    label,
    value,
    options,
    onChange,
}: SegmentedControlProps<T>) {
    return (
        <div
            role="group"
            aria-label={label}
            className="flex rounded border border-border-light p-0.5 dark:border-border-dark">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    title={option.title}
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        value === option.value
                            ? "bg-light-50 text-light-950 shadow-sm dark:bg-dark-100 dark:text-dark-950"
                            : "text-light-700 hover:text-light-950 dark:text-dark-700 dark:hover:text-dark-950"
                    }`}>
                    {option.label}
                </button>
            ))}
        </div>
    );
}
