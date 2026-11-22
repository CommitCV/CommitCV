import { useCallback, useState, type MouseEvent, type ReactNode } from "react";
import Button from "@components/ui/button";
import ContextMenu from "@components/ui/context-menu";
import { EllipsisVertical } from "@components/ui/icons";
import type { ExportKind } from "@resume/export-resume";

interface CardMenuOptions {
    /** What the card is called, for accessible labels. */
    name: string;
    onOpen: () => void;
    onExport: (kind: ExportKind) => void;
    onDelete: () => void;
}

/**
 * The actions menu of a library card: a three-dot button and a right-click
 * on the card both open it. Delete asks for confirmation in the card.
 */
export function useCardMenu({
    name,
    onOpen,
    onExport,
    onDelete,
}: CardMenuOptions) {
    const [menu, setMenu] = useState<{ x: number; y: number }>();
    const [confirming, setConfirming] = useState(false);
    const close = useCallback(() => setMenu(undefined), []);

    const onContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
    };

    const kebab = (
        <button
            type="button"
            aria-label={`Actions for ${name}`}
            aria-haspopup="menu"
            onClick={(event) => {
                const box = event.currentTarget.getBoundingClientRect();
                setMenu({ x: box.left, y: box.bottom });
            }}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-md hover:bg-light-300 focus-visible:ring-2 dark:hover:bg-dark-200">
            <EllipsisVertical className="h-4 w-4" />
        </button>
    );

    const popup = menu && (
        <ContextMenu
            label={`${name} actions`}
            x={menu.x}
            y={menu.y}
            onClose={close}
            items={[
                { label: "Open", onSelect: onOpen },
                {
                    label: "Download JSON",
                    onSelect: () => onExport("json"),
                    separatorBefore: true,
                },
                { label: "Download Typst", onSelect: () => onExport("typ") },
                { label: "Download PDF", onSelect: () => onExport("pdf") },
                {
                    label: "Delete",
                    onSelect: () => setConfirming(true),
                    separatorBefore: true,
                },
            ]}
        />
    );

    const confirm: ReactNode = confirming && (
        <div className="flex flex-wrap items-center gap-2 border-t-2 border-border-light p-2 dark:border-border-dark">
            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-red-600"
                onClick={() => {
                    setConfirming(false);
                    onDelete();
                }}>
                Confirm delete {name}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}>
                Cancel
            </Button>
        </div>
    );

    return { onContextMenu, kebab, popup, confirm };
}
