export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

/** The scales offered in the zoom menu: 50% to 400% in steps of 50. */
export const ZOOM_PRESETS = Array.from(
    { length: (MAX_ZOOM - 0.5) / 0.5 + 1 },
    (_, index) => 0.5 + index * 0.5,
);

export type FitMode = "width" | "height";

export function clampZoom(zoom: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** The next preset scale above (or below) `zoom`, for stepping with keys. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
    const next =
        direction === 1
            ? ZOOM_PRESETS.find((preset) => preset > zoom + 0.001)
            : [...ZOOM_PRESETS]
                  .reverse()
                  .find((preset) => preset < zoom - 0.001);
    return next ?? clampZoom(zoom);
}
