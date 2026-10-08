import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { clampZoom, stepZoom } from "@components/editor/zoom";

/** Caps each wheel step so a ctrl+mouse-wheel notch doesn't jump too far. */
const MAX_WHEEL_DELTA = 25;
const WHEEL_SENSITIVITY = 0.01;

/** Safari's trackpad pinch events, which aren't in the DOM typings. */
interface GestureEvent extends UIEvent {
    scale: number;
    clientX: number;
    clientY: number;
}

/**
 * Zooms a scroll container with a trackpad pinch (ctrl+wheel in Chrome and
 * Firefox, gesture events in Safari) or a two-finger touch pinch, keeping
 * the point under the fingers in place. ⌘/Ctrl with +, − and 0 step through
 * the presets and reset while the pointer or focus is in the container, so
 * browser zoom still works elsewhere.
 */
export function usePreviewZoom(
    ref: RefObject<HTMLElement | null>,
    zoom: number,
    onZoom: (zoom: number) => void,
) {
    // Events can arrive faster than renders, so track the latest zoom here.
    const zoomRef = useRef(zoom);
    const renderedZoom = useRef(zoom);
    const anchor = useRef<{ x: number; y: number } | null>(null);
    const onZoomRef = useRef(onZoom);

    useEffect(() => {
        onZoomRef.current = onZoom;
    }, [onZoom]);

    // Scroll so the anchored point stays under the fingers after rescaling.
    useLayoutEffect(() => {
        const container = ref.current;
        const point = anchor.current;
        const ratio = zoom / renderedZoom.current;
        renderedZoom.current = zoom;
        zoomRef.current = zoom;
        anchor.current = null;
        if (!container || !point || ratio === 1) return;
        container.scrollLeft =
            (container.scrollLeft + point.x) * ratio - point.x;
        container.scrollTop = (container.scrollTop + point.y) * ratio - point.y;
    }, [ref, zoom]);

    useEffect(() => {
        const container = ref.current;
        if (!container) return;

        function zoomTo(next: number, clientX: number, clientY: number) {
            const clamped = clampZoom(next);
            if (clamped === zoomRef.current) return;
            const bounds = container!.getBoundingClientRect();
            anchor.current = {
                x: clientX - bounds.left,
                y: clientY - bounds.top,
            };
            zoomRef.current = clamped;
            onZoomRef.current(clamped);
        }

        function onWheel(event: WheelEvent) {
            // Trackpad pinches arrive as wheel events with ctrlKey set.
            if (!event.ctrlKey) return;
            event.preventDefault();
            const delta = Math.max(
                -MAX_WHEEL_DELTA,
                Math.min(MAX_WHEEL_DELTA, event.deltaY),
            );
            zoomTo(
                zoomRef.current * Math.exp(-delta * WHEEL_SENSITIVITY),
                event.clientX,
                event.clientY,
            );
        }

        let gestureStart = 1;
        function onGestureStart(event: Event) {
            event.preventDefault();
            gestureStart = zoomRef.current;
        }
        function onGestureChange(event: Event) {
            event.preventDefault();
            const gesture = event as GestureEvent;
            zoomTo(
                gestureStart * gesture.scale,
                gesture.clientX,
                gesture.clientY,
            );
        }

        let touchStart: { distance: number; zoom: number } | null = null;
        function touchDistance(touches: TouchList) {
            return Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY,
            );
        }
        function onTouchStart(event: TouchEvent) {
            touchStart =
                event.touches.length === 2
                    ? {
                          distance: touchDistance(event.touches),
                          zoom: zoomRef.current,
                      }
                    : null;
        }
        function onTouchMove(event: TouchEvent) {
            if (!touchStart || event.touches.length !== 2) return;
            event.preventDefault();
            const [first, second] = [event.touches[0], event.touches[1]];
            zoomTo(
                (touchStart.zoom * touchDistance(event.touches)) /
                    touchStart.distance,
                (first.clientX + second.clientX) / 2,
                (first.clientY + second.clientY) / 2,
            );
        }
        function onTouchEnd(event: TouchEvent) {
            if (event.touches.length < 2) touchStart = null;
        }

        function onKeyDown(event: KeyboardEvent) {
            if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
            const inPreview =
                container!.matches(":hover") ||
                container!.contains(document.activeElement);
            if (!inPreview) return;
            const next =
                event.key === "=" || event.key === "+"
                    ? stepZoom(zoomRef.current, 1)
                    : event.key === "-"
                      ? stepZoom(zoomRef.current, -1)
                      : event.key === "0"
                        ? 1
                        : null;
            if (next === null) return;
            event.preventDefault();
            const bounds = container!.getBoundingClientRect();
            zoomTo(
                next,
                bounds.left + container!.clientWidth / 2,
                bounds.top + container!.clientHeight / 2,
            );
        }

        document.addEventListener("keydown", onKeyDown);
        container.addEventListener("wheel", onWheel, { passive: false });
        container.addEventListener("gesturestart", onGestureStart);
        container.addEventListener("gesturechange", onGestureChange);
        container.addEventListener("touchstart", onTouchStart);
        container.addEventListener("touchmove", onTouchMove, {
            passive: false,
        });
        container.addEventListener("touchend", onTouchEnd);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            container.removeEventListener("wheel", onWheel);
            container.removeEventListener("gesturestart", onGestureStart);
            container.removeEventListener("gesturechange", onGestureChange);
            container.removeEventListener("touchstart", onTouchStart);
            container.removeEventListener("touchmove", onTouchMove);
            container.removeEventListener("touchend", onTouchEnd);
        };
    }, [ref]);
}
