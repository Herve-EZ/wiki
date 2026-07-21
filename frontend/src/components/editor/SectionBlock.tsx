import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { PagePicker } from "./PagePicker";
import { MentionPicker } from "./MentionPicker";
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
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const lockedByOther = lock && !isMine;
  const cls = editing || isMine ? "section locked-mine" : lockedByOther ? "section locked-theirs" : "section";

  function insertLink(page: PageRef) {
    const ta = ref.current;
    const start = ta ? ta.selectionStart : draft.length;
    const end = ta ? ta.selectionEnd : draft.length;
    const selected = draft.slice(start, end);
    // Wrap a selection with a label; otherwise insert the plain title token.
    const token = selected ? `[[${page.slug}|${selected}]]` : `[[${page.title}]]`;
    const next = draft.slice(0, start) + token + draft.slice(end);
    onChangeDraft(next);
    setPickerOpen(false);
    requestAnimationFrame(() => {
      if (!ta) return;
      const pos = start + token.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  const rawHtml = renderMarkdown(preprocessWikilinks(section.text, pageIndex));
  const html = searchQuery ? highlightHtml(rawHtml, searchQuery) : rawHtml;

  return (
    <div className={cls}>
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
          <textarea
            ref={ref}
            className="sec-textarea"
            value={draft}
            onChange={(e) => onChangeDraft(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={onSaveEdit}>
              <Icon name="check" size={13} /> Enregistrer
            </button>
            <button className="btn btn-ghost" onClick={onCancelEdit}>
              Annuler
            </button>
            <div style={{ position: "relative", marginLeft: "auto", display: "flex", gap: 4 }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => { setMentionOpen((o) => !o); setPickerOpen(false); }}
                title="Mentionner un membre"
              >
                <Icon name="at" size={13} /> Mentionner
              </button>
              {mentionOpen && (
                <MentionPicker
                  members={members}
                  onPick={(m) => {
                    const ta = ref.current;
                    const pos = ta ? ta.selectionStart : draft.length;
                    const token = `@${m.display_name || m.email}`;
                    const next = draft.slice(0, pos) + token + " " + draft.slice(pos);
                    onChangeDraft(next);
                    setMentionOpen(false);
                    requestAnimationFrame(() => {
                      if (!ta) return;
                      const p = pos + token.length + 1;
                      ta.focus();
                      ta.setSelectionRange(p, p);
                    });
                  }}
                  onClose={() => setMentionOpen(false)}
                />
              )}
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => { setPickerOpen((o) => !o); setMentionOpen(false); }}
                title="Insérer un lien vers une page"
              >
                <Icon name="link" size={13} /> Lier une page
              </button>
              {pickerOpen && (
                <PagePicker
                  pages={pages}
                  excludeId={currentPageId}
                  onPick={insertLink}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
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
