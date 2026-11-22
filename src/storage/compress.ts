async function pipe(
    bytes: Uint8Array<ArrayBuffer>,
    stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
    const out = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(out).arrayBuffer());
}

/** gzip of the JSON text of `value`. */
export function compressJson(value: unknown): Promise<Uint8Array<ArrayBuffer>> {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    return pipe(bytes, new CompressionStream("gzip"));
}

/** Inverse of `compressJson`. */
export async function decompressJson(
    bytes: Uint8Array<ArrayBuffer>,
): Promise<unknown> {
    const text = await pipe(bytes, new DecompressionStream("gzip"));
    return JSON.parse(new TextDecoder().decode(text));
}
