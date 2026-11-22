import { useEffect, useState } from "react";
import type { IResume } from "@resume/resume";
import { localThumbnails } from "@store/useResumeStore";

/**
 * An object URL for a remote resume's preview, cached in this browser
 * (keyed by connection and path, refreshed when the content hash changes).
 * Nothing is written to the repository. Stays undefined until `visible`.
 */
export function useRemoteThumbnail(
    key: string,
    resume: IResume | undefined,
    visible: boolean,
): string | undefined {
    const [url, setUrl] = useState<string>();

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        let current: string | undefined;
        function show(blob: Blob | undefined) {
            if (!blob || cancelled) return;
            if (current) URL.revokeObjectURL(current);
            current = URL.createObjectURL(blob);
            setUrl(current);
        }
        void (async () => {
            try {
                // A stale preview beats a blank card while the new one renders.
                show((await localThumbnails.load(key))?.blob);
                if (resume) show(await localThumbnails.ensure(key, resume));
            } catch {
                // The placeholder stays.
            }
        })();
        return () => {
            cancelled = true;
            if (current) URL.revokeObjectURL(current);
        };
    }, [key, resume, visible]);

    return url;
}
