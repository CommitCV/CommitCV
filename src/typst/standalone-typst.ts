import type { IResume } from "@resume/resume";
import { resumeToTypst } from "./resume-to-typst";

// Inlined in dependency order so no imports remain in the single file.
const ASSETS = [
    "/typst/fontawesome/lib-gen-map.typ",
    "/typst/fontawesome/lib-impl.typ",
    "/typst/fontawesome/lib-gen-func.typ",
    "/typst/fontawesome/lib.typ",
    "/typst/jake.typ",
];

/**
 * A single self-contained .typ file: the template and icon library
 * inlined above the resume body, openable in any Typst environment.
 */
export async function standaloneTypst(resume: IResume): Promise<string> {
    const sources = await Promise.all(
        ASSETS.map(async (path) => {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`failed to load ${path}`);
            return stripImports(await response.text());
        }),
    );
    return `${sources.join("\n\n")}\n\n${resumeToTypst(resume, { standalone: true })}`;
}

function stripImports(source: string): string {
    return source
        .split("\n")
        .filter((line) => !line.startsWith('#import "'))
        .join("\n");
}
