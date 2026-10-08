import type { DragEvent } from "react";
import {
    resolveDrop,
    type TDragItem,
    type TDropPosition,
    type TDropTarget,
} from "@resume/drag-drop";
import { useResumeStore } from "@store/useResumeStore";

/**
 * Drop handlers for one zone. `pick` maps the pointer's vertical position
 * in the zone (0 at the top, 1 at the bottom) to a drop position, or
 * `null` to ignore that kind of drag. Returns the active position, if
 * this zone is the current drop target, for drawing an indicator.
 */
export function useDropZone(
    targetAt: (position: TDropPosition) => TDropTarget,
    pick: (ratio: number, item: TDragItem) => TDropPosition | null,
) {
    const resume = useResumeStore((store) => store.resume);
    const dragItem = useResumeStore((store) => store.dragItem);
    const dropTarget = useResumeStore((store) => store.dropTarget);
    const setDropTarget = useResumeStore((store) => store.setDropTarget);
    const drop = useResumeStore((store) => store.drop);

    const isOurs = (target: TDropTarget | null) =>
        target !== null &&
        sameTarget(target, targetAt(target.position as TDropPosition));
    const active = isOurs(dropTarget) ? dropTarget!.position : null;

    function onDragOver(event: DragEvent<HTMLElement>) {
        if (!dragItem || !resume) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const position = pick(
            (event.clientY - rect.top) / rect.height,
            dragItem,
        );
        const target = position && targetAt(position);
        if (!target || !resolveDrop(resume, dragItem, target)) {
            if (isOurs(dropTarget)) setDropTarget(null);
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        if (!dropTarget || !sameTarget(dropTarget, target)) {
            setDropTarget(target);
        }
    }

    function onDragLeave(event: DragEvent<HTMLElement>) {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        if (isOurs(dropTarget)) setDropTarget(null);
    }

    function onDrop(event: DragEvent<HTMLElement>) {
        if (!isOurs(dropTarget)) return;
        event.preventDefault();
        event.stopPropagation();
        drop();
    }

    return { active, handlers: { onDragOver, onDragLeave, onDrop } };
}

/** Highlight for a zone that would take the drop "inside" it. */
export const NEST_HIGHLIGHT = "bg-accent/15 ring-2 ring-inset ring-accent";

function sameTarget(a: TDropTarget, b: TDropTarget): boolean {
    return (
        a.kind === b.kind &&
        a.position === b.position &&
        a.path.join(".") === b.path.join(".") &&
        (a.kind !== "text" || b.kind !== "text" || a.index === b.index)
    );
}
