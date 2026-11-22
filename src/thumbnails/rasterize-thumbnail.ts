import { splitSvgPages } from "@typst/split-svg-pages";
import { encodeThumbnail } from "./encode-thumbnail";

const WIDTH = 320;

/** Draws the first page of a Typst SVG to a WebP (JPEG where unsupported). Needs a browser DOM. */
export async function rasterizeFirstPage(svg: string): Promise<Blob> {
    const [page] = splitSvgPages(svg);
    // Typst embeds a script with raw `&&` (invalid XML, so the image won't
    // decode) and foreignObject text-selection layers (which taint the
    // canvas so it can't be exported). Neither affects the drawn page.
    const clean = page
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replace(/<foreignObject[\s\S]*?<\/foreignObject>/g, "");
    const url = URL.createObjectURL(
        new Blob([clean], { type: "image/svg+xml" }),
    );
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = Math.round(
            (WIDTH * image.naturalHeight) / image.naturalWidth,
        );
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return await encodeThumbnail(canvas);
    } finally {
        URL.revokeObjectURL(url);
    }
}
