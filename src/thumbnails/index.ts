import { resumeToTypst } from "@typst/resume-to-typst";
import { typst } from "@typst/typst-client";
import { IdbResumeStorage } from "@storage/idb-resume-storage";
import { rasterizeFirstPage } from "./rasterize-thumbnail";
import { createThumbnailService } from "./thumbnail-service";

/** Wires the service to the real renderer and cache. */
export function createBrowserThumbnails(cache: IdbResumeStorage) {
    return createThumbnailService({
        cache,
        render: async (resume) =>
            rasterizeFirstPage(
                await typst.renderSvg(resumeToTypst(resume), {
                    background: true,
                }),
            ),
    });
}
