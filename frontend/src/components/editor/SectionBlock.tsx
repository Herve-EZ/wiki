import { useEffect, useRef } from "react";
import { Icon } from "../Icon";
import { renderMarkdown } from "../../lib/markdown";
import type { Section } from "../../lib/sections";
import type { SectionLock } from "../../hooks/usePageSocket";

interface Props {
  section: Section;
  lock: SectionLock | undefined;
  isMine: boolean;
  editing: boolean;
  draft: string;
  canEdit: boolean;
  onStartEdit: () => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function SectionBlock({
  section,
  lock,
  isMine,
  editing,
  draft,
  canEdit,
  onStartEdit,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const lockedByOther = lock && !isMine;
  const cls = editing || isMine ? "section locked-mine" : lockedByOther ? "section locked-theirs" : "section";

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
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={onSaveEdit}>
              <Icon name="check" size={13} /> Enregistrer
            </button>
            <button className="btn btn-ghost" onClick={onCancelEdit}>
              Annuler
            </button>
          </div>
        </>
      ) : (
        <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(section.text) }} />
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
