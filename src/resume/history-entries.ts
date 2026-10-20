import type { IResume } from "@resume/resume";
import type { IHistoryEntry } from "@storage/resume-storage";
import { generateCommitBody } from "./commit-message";
import { formatRelativeTime } from "./library-entries";

/** "5 minutes ago by Ada". */
export function entryMeta(entry: IHistoryEntry, now = Date.now()): string {
    return `${formatRelativeTime(entry.date, now)} by ${entry.author}`;
}

/** What restoring `version` over `current` changes, one line per change. */
export function restoreSummary(current: IResume, version: IResume): string[] {
    return generateCommitBody(current, version)
        .split("\n")
        .map((line) => line.replace(/^- /, "").trim())
        .filter(Boolean);
}
