import { useEffect, useState } from "react";

function compute(): boolean {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Whether the app is currently rendering dark, for the rare cases where CSS
 * variables aren't enough and JS has to know — a Mermaid diagram is drawn to
 * SVG with baked-in colours, so it has to be redrawn when the theme flips.
 *
 * Tracks both signals the design system uses: the `data-theme` attribute set by
 * the theme toggle, and the OS preference when no attribute is set.
 */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(compute);

  useEffect(() => {
    const update = () => setDark(compute());
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", update);

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      mql.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  return dark;
}
