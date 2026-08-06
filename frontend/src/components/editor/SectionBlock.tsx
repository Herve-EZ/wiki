import { useMemo } from "react";
import { Icon } from "../Icon";
import { MarkdownEditor } from "./MarkdownEditor";
import { MermaidFigure } from "../MermaidFigure";
import { splitDiagrams } from "../../lib/mermaidBlocks";
import { renderMarkdown } from "../../lib/markdown";
import { preprocessWikilinks, type PageRef } from "../../lib/wikilinks";
import type { Section } from "../../lib/sections";
import type { SectionLock } from "../../hooks/usePageSocket";
import type { TranscludeMap } from "../../lib/transclude";
import type { Member } from "../../lib/types";

interface Props {
  section: Section;
  lock: SectionLock | undefined;
  isMine: boolean;
  editing: boolean;
  draft: string;
  canEdit: boolean;
  pages: PageRef[];
  pageIndex: Map<string, PageRef>;
  currentPageId: string;
  workspaceSlug?: string;
  searchQuery?: string;
  members?: Member[];
  /** Resolved `![[…]]` includes for the whole page (see useTransclusions). */
  transclusions?: TranscludeMap;
  onStartEdit: () => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

/** Stable identity so the mention set isn't rebuilt on every render. */
const NO_MEMBERS: Member[] = [];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightHtml(html: string, query: string): string {
  if (!query) return html;
  const escaped = escapeRegExp(query);
  const re = new RegExp(escaped, "gi");
  // Split by tags, only replace in text segments.
  return html.replace(/([^<]*)(<[^>]*>)/g, (_, text, tag) => {
    return text.replace(re, '<mark class="search-hit">$&</mark>') + tag;
  // Handle trailing text after last tag.
  }).replace(/([^<>]+)$/, (_, text) =>
    text.replace(re, '<mark class="search-hit">$&</mark>'),
  );
}

export function SectionBlock({
  section,
  lock,
  isMine,
  editing,
  draft,
  canEdit,
  pages,
  pageIndex,
  currentPageId,
  workspaceSlug,
  searchQuery,
  members = NO_MEMBERS,
  transclusions,
  onStartEdit,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
}: Props) {
  const lockedByOther = lock && !isMine;
  const cls = editing || isMine ? "section locked-mine" : lockedByOther ? "section locked-theirs" : "section";

  // Names the renderer will highlight — the same set the server matches when
  // it decides who gets a "you were mentioned" notification.
  const mentions = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      if (m.display_name) set.add(m.display_name.toLowerCase());
      set.add(m.email.toLowerCase());
    }
    return set;
  }, [members]);

  // Diagrams are split out of the Markdown so each one is a React child, not
  // something an effect has to find in the DOM and replace (see mermaidBlocks).
  const segments = useMemo(() => splitDiagrams(section.text), [section.text]);

  function renderSegment(text: string): string {
    const raw = renderMarkdown(preprocessWikilinks(text, pageIndex), {
      transclusions,
      pageIndex,
      mentions,
    });
    return searchQuery ? highlightHtml(raw, searchQuery) : raw;
  }

  return (
    <div className={cls} id={`sec-${section.id}`}>
      {lockedByOther && (
        <span className="lock-tag theirs">
          <Icon name="lock" size="xs" />
          {lock?.display_name} édite cette section
        </span>
      )}
      {(editing || isMine) && (
        <span className="lock-tag mine">
          <Icon name="lock" size="xs" />
          Vous éditez cette section
        </span>
      )}

      {editing ? (
        <>
          <MarkdownEditor
            value={draft}
            onChange={onChangeDraft}
            pages={pages}
            currentPageId={currentPageId}
            members={members}
            workspaceSlug={workspaceSlug}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={onSaveEdit}>
              <Icon name="check" size="sm" /> Enregistrer
            </button>
            <button className="btn btn-ghost" onClick={onCancelEdit}>
              Annuler
            </button>
          </div>
        </>
      ) : (
        <div className="md-body">
          {segments.map((seg, i) =>
            seg.kind === "diagram" ? (
              <MermaidFigure key={`d${i}`} source={seg.source} />
            ) : (
              <div
                key={`m${i}`}
                className="md-seg"
                dangerouslySetInnerHTML={{ __html: renderSegment(seg.text) }}
              />
            ),
          )}
        </div>
      )}

      {!editing && canEdit && !lockedByOther && (
        <div className="section-actions">
          <button className="btn btn-ghost" onClick={onStartEdit}>
            <Icon name="pencil" size="xs" /> Éditer
          </button>
        </div>
      )}
    </div>
  );
}
