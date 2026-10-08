import type { TDropPosition } from "@resume/drag-drop";

interface DropLineProps {
    position: TDropPosition | null;
    /** Distance from the parent's padding edge to the middle of the gap. */
    outset: number;
}

/** Insertion bar drawn in the gap above or below a `relative` card. */
export default function DropLine({ position, outset }: DropLineProps) {
    if (position !== "before" && position !== "after") return null;
    const side = position === "before" ? "top" : "bottom";
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 h-[3px] rounded-full bg-accent"
            // Centre the 3px bar on the gap's midline.
            style={{ [side]: -(outset + 1.5) }}
        />
    );
}
