import { useEffect, useState } from "react";
export function useMobileBreakpoint(query = "(max-width: 768px)") {
    const getMatch = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
    const [isMobile, setIsMobile] = useState(getMatch);
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const mediaQuery = window.matchMedia(query);
        const updateMatch = (event) => {
            setIsMobile(event.matches);
        };
        updateMatch(mediaQuery);
        const listener = (event) => updateMatch(event);
        mediaQuery.addEventListener("change", listener);
        return () => mediaQuery.removeEventListener("change", listener);
    }, [query]);
    return isMobile;
}
