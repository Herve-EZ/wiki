import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import type { Section } from "../lib/sections";
import type { Comment } from "../lib/types";

interface Props {
  pageId: string;
  sections: Section[];
  userId: string;
  canWrite: boolean;
  isOwner: boolean;
  onClose: () => void;
}

function relTime(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return "";
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export function CommentsPanel({ pageId, sections, userId, canWrite, isOwner, onClose }: Props) {
  const qc = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const [draft, setDraft] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const q = useQuery({ queryKey: ["comments", pageId], queryFn: () => api.listComments(pageId) });
  const comments = q.data ?? [];

  const sectionLabel = useMemo(() => {
    const map = new Map(sections.map((s) => [s.id, s.headingText || "Introduction"]));
    return (id: string) => (id ? map.get(id) ?? id : null);
  }, [sections]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["comments", pageId] });
    void qc.invalidateQueries({ queryKey: ["comments-count", pageId] });
  };

  const createM = useMutation({
    mutationFn: (body: { body: string; section_id?: string; parent?: string | null }) =>
      api.createComment({ page: pageId, ...body }),
    onSuccess: () => {
      setDraft("");
      setReplyDraft("");
      setReplyTo(null);
      invalidate();
    },
  });
  const resolveM = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      api.updateComment(id, { resolved }),
    onSuccess: invalidate,
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => api.deleteComment(id),
    onSuccess: invalidate,
  });

  const tops = comments.filter((c) => !c.parent);
  const repliesOf = (id: string) => comments.filter((c) => c.parent === id);
  const visibleTops = tops.filter((c) => showResolved || !c.resolved);

  function Thread({ c }: { c: Comment }) {
    const canDelete = c.author === userId || isOwner;
    const canResolve = canWrite || c.author === userId;
    return (
      <div className={`cmt-thread${c.resolved ? " resolved" : ""}`}>
        <div className="cmt">
          <Avatar seed={c.author_email} label={c.author_display || c.author_email} size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cmt-head">
              <span className="cmt-author">{c.author_display || c.author_email}</span>
              <span className="cmt-time">{relTime(c.created_at)}</span>
              {sectionLabel(c.section_id) && (
                <span className="cmt-section" title="Section concernée">
                  § {sectionLabel(c.section_id)}
                </span>
              )}
              {c.resolved && <span className="cmt-resolved-tag">résolu</span>}
            </div>
            <div className="cmt-body">{c.body}</div>
            <div className="cmt-actions">
              <button className="link" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                Répondre
              </button>
              {canResolve && (
                <button
                  className="link"
                  onClick={() => resolveM.mutate({ id: c.id, resolved: !c.resolved })}
                >
                  {c.resolved ? "Rouvrir" : "Résoudre"}
                </button>
              )}
              {canDelete && (
                <button className="link danger" onClick={() => deleteM.mutate(c.id)}>
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>

        {repliesOf(c.id).map((r) => (
          <div className="cmt reply" key={r.id}>
            <Avatar seed={r.author_email} label={r.author_display || r.author_email} size={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cmt-head">
                <span className="cmt-author">{r.author_display || r.author_email}</span>
                <span className="cmt-time">{relTime(r.created_at)}</span>
              </div>
              <div className="cmt-body">{r.body}</div>
              {(r.author === userId || isOwner) && (
                <div className="cmt-actions">
                  <button className="link danger" onClick={() => deleteM.mutate(r.id)}>
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {replyTo === c.id && (
          <div className="cmt-reply-box">
            <textarea
              className="input"
              rows={2}
              placeholder="Votre réponse…"
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
              <button className="btn btn-ghost" onClick={() => setReplyTo(null)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                disabled={!replyDraft.trim() || createM.isPending}
                onClick={() => createM.mutate({ body: replyDraft.trim(), parent: c.id })}
              >
                Répondre
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cmt-drawer">
      <div className="cmt-drawer-head">
        <h4 style={{ margin: 0 }}>
          <Icon name="mail" size={15} /> Commentaires
        </h4>
        <label className="cmt-toggle">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Afficher les résolus
        </label>
        <button className="icon-btn" title="Fermer" aria-label="Fermer" onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="cmt-list">
        {q.isLoading && <p className="muted">Chargement…</p>}
        {!q.isLoading && visibleTops.length === 0 && (
          <p className="muted">Aucun commentaire{tops.length ? " visible" : ""}.</p>
        )}
        {visibleTops.map((c) => (
          <Thread key={c.id} c={c} />
        ))}
      </div>

      <div className="cmt-compose">
        {sections.length > 0 && (
          <select
            className="input"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            title="Section concernée"
          >
            <option value="">Commentaire général</option>
            {sections
              .filter((s) => s.headingText)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  § {s.headingText}
                </option>
              ))}
          </select>
        )}
        <textarea
          className="input"
          rows={3}
          placeholder="Ajouter un commentaire…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          className="btn btn-primary btn-block"
          disabled={!draft.trim() || createM.isPending}
          onClick={() => createM.mutate({ body: draft.trim(), section_id: sectionId })}
        >
          <Icon name="check" size={13} /> Commenter
        </button>
      </div>
    </div>
  );
}
