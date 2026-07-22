import { Icon } from "../Icon";
import { MarkdownEditor } from "./MarkdownEditor";
import { renderMarkdown } from "../../lib/markdown";
import { preprocessWikilinks, type PageRef } from "../../lib/wikilinks";
import type { Section } from "../../lib/sections";
import type { SectionLock } from "../../hooks/usePageSocket";
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
  searchQuery?: string;
  members?: Member[];
  onStartEdit: () => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

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
  searchQuery,
  members = [],
  onStartEdit,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
}: Props) {
  const lockedByOther = lock && !isMine;
  const cls = editing || isMine ? "section locked-mine" : lockedByOther ? "section locked-theirs" : "section";

  const rawHtml = renderMarkdown(preprocessWikilinks(section.text, pageIndex));
  const html = searchQuery ? highlightHtml(rawHtml, searchQuery) : rawHtml;

  return (
    <div className={cls} id={`sec-${section.id}`}>
      {lockedByOther && (
        <span className="lock-tag theirs">
          <Icon name="lock" size={11} />
          {lock?.display_name} édite cette section
        </span>
      )}
      {(editing || isMine) && (
        <span className="lock-tag mine">
          <Icon name="lock" size={11} />
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
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={onSaveEdit}>
              <Icon name="check" size={13} /> Enregistrer
            </button>
            <button className="btn btn-ghost" onClick={onCancelEdit}>
              Annuler
            </button>
          </div>
        </>
      ) : (
        <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
      )}

      {!editing && canEdit && !lockedByOther && (
        <div className="section-actions">
          <button className="btn btn-ghost" onClick={onStartEdit}>
            <Icon name="settings" size={12} /> Éditer
          </button>
        </div>
      )}
    </div>
  );
}
