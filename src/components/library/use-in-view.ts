import { useCallback, useState } from "react";

/** True once the element has scrolled near the viewport (and stays true). */
export function useInView(): [(node: Element | null) => void, boolean] {
    const [seen, setSeen] = useState(
        typeof IntersectionObserver === "undefined",
    );
    const ref = useCallback((node: Element | null) => {
        if (!node || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setSeen(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(node);
    }, []);
    return [ref, seen];
}
