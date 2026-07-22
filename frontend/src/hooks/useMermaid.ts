import { useEffect } from "react";

/**
 * Turn `<pre class="mermaid">` blocks inside `ref` into rendered diagrams.
 * Mermaid is imported dynamically so the ~500 kB library only loads on pages
 * that actually contain a diagram. Re-runs whenever `html` changes (the section
 * body is re-set on every edit/save).
 */
export function useMermaid(ref: React.RefObject<HTMLElement | null>, html: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("pre.mermaid"));
    if (nodes.length === 0) return;

    let cancelled = false;
    // Keep the raw source so a re-run (theme change, edit) restarts cleanly.
    nodes.forEach((n) => {
      if (n.dataset.src == null) n.dataset.src = n.textContent ?? "";
    });

    void import("mermaid").then(({ default: mermaid }) => {
      if (cancelled) return;
      const root = document.documentElement.getAttribute("data-theme");
      const dark =
        root === "dark" ||
        (root == null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        securityLevel: "strict",
        fontFamily: "inherit",
      });
      nodes.forEach((n) => {
        n.removeAttribute("data-processed");
        n.textContent = n.dataset.src ?? "";
      });
      mermaid.run({ nodes }).catch(() => {
        /* invalid diagram source — mermaid renders its own error box */
      });
    });

    return () => {
      cancelled = true;
    };
  }, [ref, html]);
}
