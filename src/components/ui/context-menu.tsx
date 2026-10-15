import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface IContextMenuItem {
    label: string;
    onSelect: () => void;
    disabled?: boolean;
    /** Shows a check mark, for the option currently in effect. */
    checked?: boolean;
    /** A keyboard shortcut hint shown at the item's right edge. */
    shortcut?: string;
    /** Draws a divider above the item, to group related options. */
    separatorBefore?: boolean;
}

interface ContextMenuProps {
    label: string;
    /** Where the menu opens, in viewport coordinates. */
    x: number;
    y: number;
    items: IContextMenuItem[];
    onClose: () => void;
}

const EDGE_GAP = 8;

/** A right-click menu that closes on outside clicks, Escape, scroll or resize. */
export default function ContextMenu({
    label,
    x,
    y,
    items,
    onClose,
}: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: x, top: y });

    // Keep the menu on screen near the pointer, then focus the first item.
    useLayoutEffect(() => {
        const menu = ref.current;
        if (!menu) return;
        const { width, height } = menu.getBoundingClientRect();
        setPosition({
            left: Math.min(x, window.innerWidth - width - EDGE_GAP),
            top: Math.min(y, window.innerHeight - height - EDGE_GAP),
        });
        menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }, [x, y]);

    useEffect(() => {
        const closeOutside = (event: Event) => {
            if (!ref.current?.contains(event.target as Node)) onClose();
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("pointerdown", closeOutside, true);
        document.addEventListener("scroll", onClose, true);
        document.addEventListener("keydown", closeOnEscape);
        window.addEventListener("resize", onClose);
        window.addEventListener("blur", onClose);
        return () => {
            document.removeEventListener("pointerdown", closeOutside, true);
            document.removeEventListener("scroll", onClose, true);
            document.removeEventListener("keydown", closeOnEscape);
            window.removeEventListener("resize", onClose);
            window.removeEventListener("blur", onClose);
        };
    }, [onClose]);

    function moveFocus(event: React.KeyboardEvent, step: 1 | -1) {
        event.preventDefault();
        const buttons = [
            ...(ref.current?.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
            ) ?? []),
        ];
        const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
        );
        buttons.at((current + step) % buttons.length)?.focus();
    }

    return createPortal(
        <div
            ref={ref}
            role="menu"
            tabIndex={-1}
            aria-label={label}
            onKeyDown={(event) => {
                if (event.key === "ArrowDown") moveFocus(event, 1);
                if (event.key === "ArrowUp") moveFocus(event, -1);
            }}
            onContextMenu={(event) => event.preventDefault()}
            style={position}
            className="fixed z-50 min-w-36 rounded-md border border-border-light bg-light-50 py-1 text-sm text-light-950 shadow-lg dark:border-border-dark dark:bg-dark-200 dark:text-dark-950">
            {items.map((item) => (
                <div key={item.label}>
                    {item.separatorBefore && (
                        <div
                            role="separator"
                            className="my-1 h-px bg-border-light dark:bg-border-dark"
                        />
                    )}
                    <button
                        type="button"
                        role={
                            item.checked === undefined
                                ? "menuitem"
                                : "menuitemcheckbox"
                        }
                        aria-checked={item.checked}
                        disabled={item.disabled}
                        onClick={() => {
                            item.onSelect();
                            onClose();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left outline-none hover:bg-light-200 focus:bg-light-200 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-dark-100 dark:focus:bg-dark-100">
                        {item.checked !== undefined && (
                            <span
                                aria-hidden
                                className="w-3 text-accent">
                                {item.checked && "✓"}
                            </span>
                        )}
                        {item.label}
                        {item.shortcut && (
                            <kbd className="ml-auto pl-4 font-sans text-xs text-light-700 dark:text-dark-700">
                                {item.shortcut}
                            </kbd>
                        )}
                    </button>
                </div>
            ))}
        </div>,
        document.body,
    );
}
