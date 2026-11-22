import { splitSvgPages } from "@typst/split-svg-pages";

const WIDTH = 320;

/** Draws the first page of a Typst SVG to a PNG. Needs a browser DOM. */
export async function rasterizeFirstPage(svg: string): Promise<Blob> {
    const [page] = splitSvgPages(svg);
    const url = URL.createObjectURL(
        new Blob([page], { type: "image/svg+xml" }),
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
        return await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error("no blob"))),
                "image/png",
            ),
        );
    } finally {
        URL.revokeObjectURL(url);
    }
}
