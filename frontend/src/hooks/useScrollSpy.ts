import { useEffect, useState } from "react";

/**
 * Track which of `ids` is the section being read, so a table of contents can
 * mark it. The entry with the largest visible area wins; `rootMargin` biases
 * the observation window toward the top of the viewport so the answer is
 * "what you are reading", not "what happens to be on screen".
 *
 * Returns the active id (the first one until scrolling says otherwise).
 */
export function useScrollSpy(ids: string[], rootMargin = "-12% 0px -60% 0px") {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  // Depend on the contents, not the array identity — callers build the list
  // inline on every render.
  const key = ids.join("|");

  useEffect(() => {
    const nodes = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0;
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        if (best !== null) setActive(best);
      },
      { rootMargin, threshold: [0, 0.25, 0.5, 1] },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [key, rootMargin]);

  return active;
}
