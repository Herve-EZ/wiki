import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { NewPageModal } from "../components/modals/NewPageModal";
import {
  WorkspaceSettingsModal,
  type SettingsTab,
} from "../components/modals/WorkspaceSettingsModal";
import { useWorkspaceCtx } from "./workspaceContext";
import type { Role } from "../lib/types";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  editor: "Éditeur",
  viewer: "Lecteur",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

/** Landing page of a workspace: quick actions (create page, invite, settings,
 * help) gated by role, plus the most recently updated pages. */
export function WorkspaceHome() {
  const ctx = useWorkspaceCtx();
  const navigate = useNavigate();
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);

  const ws = ctx.current;

  const recent = useMemo(
    () =>
      [...ctx.pages]
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
        .slice(0, 8),
    [ctx.pages],
  );

  if (!ws) {
    return (
      <div className="center-fill">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="content">
      <div className="home">
        <div className="home-head">
          <span className="ws-logo" style={{ width: 34, height: 34, fontSize: 15, borderRadius: 9 }}>
            {ws.name.charAt(0).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{ws.name}</h2>
            <span className="muted">
              {ctx.role ? `Votre rôle : ${ROLE_LABEL[ctx.role]}` : "Espace public (lecture seule)"}
              {" · "}
              {ctx.pages.length} page{ctx.pages.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="home-actions">
          {ctx.canWrite && (
            <button className="action-card" onClick={() => setNewPageOpen(true)}>
              <Icon name="plus" size={18} />
              <b>Nouvelle page</b>
              <span>Rédigez une note, une doc, un compte-rendu…</span>
            </button>
          )}
          {ctx.isOwner && (
            <button className="action-card" onClick={() => setSettingsTab("members")}>
              <Icon name="users" size={18} />
              <b>Inviter des collaborateurs</b>
              <span>Envoyez une invitation par email avec un rôle.</span>
            </button>
          )}
          {ctx.isOwner && (
            <button className="action-card" onClick={() => setSettingsTab("general")}>
              <Icon name="settings" size={18} />
              <b>Réglages de l'espace</b>
              <span>Nom, visibilité, 2FA requise, workflows, membres.</span>
            </button>
          )}
          <button className="action-card" onClick={() => navigate("/help")}>
            <Icon name="help" size={18} />
            <b>Aide</b>
            <span>Guide d'utilisation : rôles, pages, hors-ligne…</span>
          </button>
        </div>

        {recent.length > 0 ? (
          <>
            <div className="sb-label" style={{ padding: "18px 0 8px" }}>Pages récentes</div>
            <div className="home-pages">
              {recent.map((p) => (
                <button
                  key={p.id}
                  className="page-card"
                  onClick={() => navigate(`/w/${ws.slug}/${p.id}`)}
                >
                  <Icon name="file" size={15} />
                  <span className="row-title" style={{ flex: 1, textAlign: "left" }}>{p.title}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{timeAgo(p.updated_at)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="home-empty">
            <Icon name="book" size={26} />
            <p className="muted" style={{ margin: "8px 0 14px" }}>
              Cet espace ne contient encore aucune page.
            </p>
            {ctx.canWrite ? (
              <button className="btn btn-primary" onClick={() => setNewPageOpen(true)}>
                <Icon name="plus" size={13} /> Créer la première page
              </button>
            ) : (
              <span className="muted">Demandez à un éditeur ou au propriétaire d'en créer une.</span>
            )}
          </div>
        )}
      </div>

      {newPageOpen && (
        <NewPageModal
          workspaceId={ws.id}
          workspaceSlug={ws.slug}
          onClose={() => setNewPageOpen(false)}
          onCreated={(pageId) => {
            setNewPageOpen(false);
            navigate(`/w/${ws.slug}/${pageId}`);
          }}
        />
      )}
      {settingsTab && (
        <WorkspaceSettingsModal
          workspace={ws}
          initialTab={settingsTab}
          onClose={() => setSettingsTab(null)}
          onDeleted={() => {
            setSettingsTab(null);
            navigate("/");
          }}
        />
      )}
    </div>
  );
}
