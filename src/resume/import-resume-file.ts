import type { IResume } from "./resume";
import { today } from "./dates";
import { isLegacyResume, migrateLegacyResume } from "./legacy-resume";
import { parseResume } from "./parse-resume";

/**
 * Reads a resume from an uploaded `.json` file, migrating the old
 * CommitCV format. Throws an Error with a message fit to show the user.
 */
export async function importResumeFile(
    file: Pick<File, "name" | "text">,
): Promise<IResume> {
    let json: unknown;
    try {
        json = JSON.parse(await file.text());
    } catch {
        throw new Error(`${file.name} is not valid JSON`);
    }
    if (isLegacyResume(json)) {
        return migrateLegacyResume(json, {
            filename: file.name.replace(/\.json$/i, ""),
            date: today(),
        });
    }
    return parseResume(json);
}
