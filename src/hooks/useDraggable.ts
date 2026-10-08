import type { DragEvent, PointerEvent } from "react";
import type { TDragItem } from "@resume/drag-drop";
import { useResumeStore } from "@store/useResumeStore";

const INTERACTIVE = "input, textarea, select, button, a, [contenteditable]";

/**
 * Makes an element draggable by its own surface. The element only arms
 * when a press starts outside any control and outside a nested
 * `[data-drag-root]`, so inputs keep text selection and the innermost
 * frame wins.
 */
export function useDraggable(item: TDragItem, enabled = true) {
    const setDragItem = useResumeStore((store) => store.setDragItem);

    const ownsEvent = (event: {
        target: EventTarget;
        currentTarget: Element;
    }) =>
        event.target instanceof Element &&
        event.target.closest("[data-drag-root]") === event.currentTarget;

    return {
        "data-drag-root": "",
        onPointerDown(event: PointerEvent<HTMLElement>) {
            const target = event.target as Element;
            event.currentTarget.draggable =
                enabled && ownsEvent(event) && !target.closest(INTERACTIVE);
        },
        onDragStart(event: DragEvent<HTMLElement>) {
            if (event.target !== event.currentTarget) return;
            event.dataTransfer.effectAllowed = "move";
            // Firefox only starts a drag that carries data.
            event.dataTransfer.setData("text/plain", "");
            // Re-rendering during dragstart can cancel the drag in Chrome.
            setTimeout(() => setDragItem(item));
        },
        onDragEnd(event: DragEvent<HTMLElement>) {
            if (event.target !== event.currentTarget) return;
            event.currentTarget.draggable = false;
            setDragItem(null);
        },
    };
}
