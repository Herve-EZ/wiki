import { useState } from "react";
import { Icon } from "../Icon";
import type { Section } from "../../lib/sections";

interface Props {
  sections: Section[];
}

/** Auto table of contents built from the page's headings (h1–h3). Clicking an
 * entry scrolls to that section (each SectionBlock carries id="sec-<id>"). */
export function TableOfContents({ sections }: Props) {
  const [open, setOpen] = useState(true);
  const entries = sections.filter((s) => s.level >= 1 && s.headingText);
  if (entries.length < 2) return null;

  function go(id: string) {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className={`toc${open ? " open" : ""}`}>
      <button className="toc-head" onClick={() => setOpen((o) => !o)}>
        <Icon name="list" size={13} />
        <span>Sommaire</span>
        <Icon name="chevronDown" size={13} className={`toc-caret${open ? " up" : ""}`} />
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
