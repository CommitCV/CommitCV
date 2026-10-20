import { useEffect, useState } from "react";
import { resumeStorages, localThumbnails } from "@store/useResumeStore";

/**
 * An object URL for a resume's cached first-page preview. Renders it in
 * the background when missing; undefined until one exists.
 */
export function useThumbnail(id: string): string | undefined {
    const [url, setUrl] = useState<string>();

    useEffect(() => {
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
                const cached = await localThumbnails.load(id);
                show(cached?.blob);
                if (cached || cancelled) return;
                const resume = await resumeStorages.local.load(id);
                show(await localThumbnails.ensure(id, resume));
            } catch {
                // The placeholder stays.
            }
        })();
        return () => {
            cancelled = true;
            if (current) URL.revokeObjectURL(current);
        };
    }, [id]);

    return url;
}
