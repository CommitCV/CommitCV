import { describe, expect, it } from "vitest";
import { encodeThumbnail } from "./encode-thumbnail";

/** A canvas that can encode only the given types; others come back PNG. */
function fakeCanvas(supported: string[], asked: string[] = []) {
    return {
        toBlob(cb: BlobCallback, type?: string) {
            asked.push(type ?? "");
            const actual = supported.includes(type ?? "") ? type! : "image/png";
            cb(new Blob(["x"], { type: actual }));
        },
    } as unknown as HTMLCanvasElement;
}

describe("encodeThumbnail", () => {
    it("prefers WebP", async () => {
        const asked: string[] = [];
        const blob = await encodeThumbnail(
            fakeCanvas(["image/webp", "image/jpeg"], asked),
        );
        expect(blob.type).toBe("image/webp");
        expect(asked).toEqual(["image/webp"]);
    });

    it("falls back to JPEG when the browser returns PNG for WebP", async () => {
        const blob = await encodeThumbnail(fakeCanvas(["image/jpeg"]));
        expect(blob.type).toBe("image/jpeg");
    });

    it("rejects when the canvas yields no blob", async () => {
        const canvas = {
            toBlob: (cb: BlobCallback) => cb(null),
        } as unknown as HTMLCanvasElement;
        await expect(encodeThumbnail(canvas)).rejects.toThrow("no blob");
    });
});
