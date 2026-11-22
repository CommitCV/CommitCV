import type { IResume } from "@resume/resume";
import { saveBlob, saveJson } from "@components/save-blob";
import { resumeToTypst } from "@typst/resume-to-typst";
import { standaloneTypst } from "@typst/standalone-typst";
import { typst } from "@typst/typst-client";

export type ExportKind = "json" | "typ" | "pdf";

/** Downloads `resume` as JSON, a standalone Typst file, or a PDF. */
export async function exportResume(
    resume: IResume,
    kind: ExportKind,
): Promise<void> {
    const name = resume.filename || "resume";
    if (kind === "json") {
        saveJson(`${name}.json`, resume);
    } else if (kind === "typ") {
        saveBlob(
            `${name}.typ`,
            new Blob([await standaloneTypst(resume)], { type: "text/plain" }),
        );
    } else {
        const pdf = await typst.renderPdf(resumeToTypst(resume));
        const buffer = new ArrayBuffer(pdf.byteLength);
        new Uint8Array(buffer).set(pdf);
        saveBlob(
            `${name}.pdf`,
            new Blob([buffer], { type: "application/pdf" }),
        );
    }
}
