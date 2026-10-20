import { useState } from "react";
import Button from "@components/ui/button";
import type { IConnection } from "../../git/connections";

interface ConnectionListProps {
    items: IConnection[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
}

/** Saved connections. The token is never rendered. */
export default function ConnectionList({
    items,
    selectedId,
    onSelect,
    onRemove,
}: ConnectionListProps) {
    const [confirming, setConfirming] = useState<string>();
    return (
        <ul
            aria-label="Saved connections"
            className="space-y-2">
            {items.map((item) => (
                <li
                    key={item.id}
                    data-testid="connection"
                    className={`flex flex-wrap items-center justify-between gap-2 rounded border p-2 ${item.id === selectedId ? "border-accent" : "border-border-light dark:border-border-dark"}`}>
                    <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className="min-w-0 text-left">
                        <span className="block truncate font-semibold">
                            {item.label}
                        </span>
                        <span className="block truncate text-xs text-light-700 dark:text-dark-700">
                            {item.url}
                        </span>
                    </button>
                    {confirming === item.id ? (
                        <span className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    setConfirming(undefined);
                                    onRemove(item.id);
                                }}>
                                Confirm remove
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setConfirming(undefined)}>
                                Cancel
                            </Button>
                        </span>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${item.label}`}
                            onClick={() => setConfirming(item.id)}>
                            Remove
                        </Button>
                    )}
                </li>
            ))}
        </ul>
    );
}
