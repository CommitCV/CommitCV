/** Downloads `blob` through a temporary link. */
export function saveBlob(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export function saveJson(filename: string, value: unknown): void {
    saveBlob(
        filename,
        new Blob([JSON.stringify(value, null, 4)], {
            type: "application/json",
        }),
    );
}
