"use client";

import { useEffect, useState } from "react";

/** SSR-safe media query hook. Returns false until mounted. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True on tablet and below, where the sidebar becomes a drawer. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
