const QUALITY = 0.8;

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("no blob"))),
            type,
            QUALITY,
        ),
    );
}

/**
 * WebP when the browser can encode it, else JPEG. A browser that can't
 * encode the requested type silently returns PNG, so the result's type
 * is checked. The canvas is already filled white, so JPEG loses nothing.
 */
export async function encodeThumbnail(
    canvas: HTMLCanvasElement,
): Promise<Blob> {
    const webp = await toBlob(canvas, "image/webp");
    return webp.type === "image/webp" ? webp : toBlob(canvas, "image/jpeg");
}
