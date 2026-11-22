import type { IResumeEntry } from "@storage/resume-storage";

/** Most recently edited first; entries without a save time go last. */
export function sortEntries(entries: IResumeEntry[]): IResumeEntry[] {
    return [...entries].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 86_400_000],
    ["month", 30 * 86_400_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
];

/** "5 minutes ago", "yesterday"; "just now" under a minute. */
export function formatRelativeTime(then: number, now = Date.now()): string {
    const elapsed = Math.max(0, now - then);
    const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    for (const [unit, size] of UNITS) {
        if (elapsed >= size) {
            return format.format(-Math.floor(elapsed / size), unit);
        }
    }
    return "just now";
}

/** The "Last edited ..." text, falling back to the resume's own date. */
export function lastEdited(entry: IResumeEntry, now = Date.now()): string {
    return entry.updatedAt === undefined
        ? `Last edited ${entry.date}`
        : `Last edited ${formatRelativeTime(entry.updatedAt, now)}`;
}

/** Bytes as "1.2 MB". */
export function formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}
