import { useState } from "react";
import { Icon } from "../Icon";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import type { Section } from "../../lib/sections";

interface Props {
  sections: Section[];
  /**
   * `rail` is the sticky version living in the context rail: it stays on
   * screen and marks the section you are reading. `inline` is the collapsible
   * box in the document flow, kept for windows too narrow for a rail.
   */
  variant?: "inline" | "rail";
}

/** Auto table of contents built from the page's headings (h1–h3). Clicking an
 * entry scrolls to that section (each SectionBlock carries id="sec-<id>"). */
export function TableOfContents({ sections, variant = "inline" }: Props) {
  const [open, setOpen] = useState(true);
  const entries = sections.filter((s) => s.level >= 1 && s.headingText);
  // Hooks must run unconditionally — the empty case is handled after.
  const activeId = useScrollSpy(entries.map((s) => `sec-${s.id}`));

  if (entries.length < 2) return null;

  function go(id: string) {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (variant === "rail") {
    return (
      <nav className="rail-block rail-toc-block" aria-label="Sommaire de la page">
        <p className="rail-title">Sommaire</p>
        <ul className="toc-list rail-toc">
          {entries.map((s) => {
            const active = activeId === `sec-${s.id}`;
            return (
              <li key={s.id} className={`toc-l${s.level}`}>
                <button
                  className={`toc-link${active ? " active" : ""}`}
                  aria-current={active ? "location" : undefined}
                  onClick={() => go(s.id)}
                >
                  {s.headingText}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav className={`toc${open ? " open" : ""}`}>
      <button className="toc-head" onClick={() => setOpen((o) => !o)}>
        <Icon name="list" size="sm" />
        <span>Sommaire</span>
        <Icon name="chevronDown" size="sm" className={`toc-caret${open ? " up" : ""}`} />
      </button>
      {open && (
        <ul className="toc-list">
          {entries.map((s) => (
            <li key={s.id} className={`toc-l${s.level}`}>
              <button className="toc-link" onClick={() => go(s.id)}>
                {s.headingText}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
