import { useMemo, useState } from "react";
import { Icon } from "../Icon";
import type { PageRef } from "../../lib/wikilinks";

interface Props {
  pages: PageRef[];
  excludeId?: string;
  onPick: (page: PageRef) => void;
  onClose: () => void;
}

/** Small searchable popover to pick a page to link to. */
export function PagePicker({ pages, excludeId, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages
      .filter((p) => p.id !== excludeId)
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
      .slice(0, 8);
  }, [pages, query, excludeId]);

  return (
    <>
      <div className="menu-backdrop" onClick={onClose} />
      <div className="link-picker">
        <input
          className="input"
          autoFocus
          placeholder="Lier une page…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              e.preventDefault();
              onPick(results[0]);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
        />
        <div className="link-picker-list">
          {results.length === 0 && <div className="palette-empty">Aucune page.</div>}
          {results.map((p) => (
            <button key={p.id} className="menu-item" onClick={() => onPick(p)}>
              <Icon name="file" size={13} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
