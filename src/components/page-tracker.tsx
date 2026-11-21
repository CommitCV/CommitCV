import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@analytics/tracker";

/**
 * Tracks route changes in React Router and notifies Umami.
 */
export default function PageTracker() {
    const location = useLocation();

    useEffect(() => {
        const fullPath = location.pathname + location.search;
        trackPageView(fullPath);
    }, [location.pathname, location.search]);

    return null;
}
