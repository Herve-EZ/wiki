import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../Icon";
import { loadPage } from "../../lib/pageStore";
import { isOnline } from "../../lib/network";
import { splitSections } from "../../lib/sections";
import type { PageRef } from "../../lib/wikilinks";

interface Props {
  pages: PageRef[];
  excludeId?: string;
  /** `section` is a section slug, or "" for the whole page. */
  onPick: (page: PageRef, section: string) => void;
  onClose: () => void;
}

/** Two-step popover for a block include: pick the source page, then the section
 * of it to pull in (or the whole page). */
export function TransclusionPicker({ pages, excludeId, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PageRef | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages
      .filter((p) => p.id !== excludeId)
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
      .slice(0, 8);
  }, [pages, query, excludeId]);

  // Sections are read from the target's body, so it has to be fetched. Shares
  // the ["page", id] key with the reader, so a visited page is already cached.
  const bodyQ = useQuery({
    queryKey: ["page", picked?.id ?? ""],
    queryFn: () => loadPage(picked!.id, isOnline()),
    enabled: !!picked,
  });

  const sections = useMemo(
    () => splitSections(bodyQ.data?.content_md ?? "").filter((s) => s.level > 0),
    [bodyQ.data],
  );

  return (
    <>
      <div className="menu-backdrop" onClick={onClose} />
      <div className="link-picker">
        {!picked ? (
          <>
            <input
              className="input"
              autoFocus
              placeholder="Inclure depuis quelle page ?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) {
                  e.preventDefault();
                  setPicked(results[0]);
                } else if (e.key === "Escape") {
                  onClose();
                }
              }}
            />
            <div className="link-picker-list">
              {results.length === 0 && <div className="palette-empty">Aucune page.</div>}
              {results.map((p) => (
                <button key={p.id} className="menu-item" onClick={() => setPicked(p)}>
                  <Icon name="file" size="sm" />
                  <span className="menu-item-label">{p.title}</span>
                  <Icon name="chevronRight" size="sm" style={{ opacity: 0.5 }} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="picker-head">
              <button
                className="icon-btn"
                title="Changer de page"
                onClick={() => setPicked(null)}
              >
                <Icon name="chevronDown" size="sm" style={{ transform: "rotate(90deg)" }} />
              </button>
              <span className="picker-head-title">{picked.title}</span>
            </div>
            <div className="link-picker-list">
              <button className="menu-item" onClick={() => onPick(picked, "")}>
                <Icon name="file" size="sm" />
                <span className="menu-item-label">Toute la page</span>
              </button>
              {bodyQ.isLoading && <div className="palette-empty">Chargement des sections…</div>}
              {bodyQ.isError && (
                <div className="palette-empty">Contenu indisponible (hors-ligne ?).</div>
              )}
              {!bodyQ.isLoading && !bodyQ.isError && sections.length === 0 && (
                <div className="palette-empty">Cette page n'a pas de titre de section.</div>
              )}
              {sections.map((s) => (
                <button
                  key={s.id}
                  className="menu-item"
                  style={{ paddingLeft: 10 + (s.level - 1) * 12 }}
                  onClick={() => onPick(picked, s.id)}
                >
                  <Icon name="heading" size="sm" />
                  <span className="menu-item-label">{s.headingText}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
