import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { NewPageModal } from "./modals/NewPageModal";
import { NewWorkspaceModal } from "./modals/NewWorkspaceModal";
import { SyncButton } from "./SyncButton";
import {
  WorkspaceSettingsModal,
  type SettingsTab,
} from "./modals/WorkspaceSettingsModal";
import type { PageListItem, Role, User, Workspace } from "../lib/types";

interface Props {
  workspaces: Workspace[];
  current: Workspace | undefined;
  role: Role | null;
  canWrite: boolean;
  isOwner: boolean;
  pages: PageListItem[];
  currentPageId?: string;
  updatedPageIds: Set<string>;
  user: User | null;
  online: boolean;
  pending: number;
  conflicts: number;
  syncing: boolean;
  onSync: () => void;
  onLogout: () => void;
}

export function Sidebar({
  workspaces,
  current,
  canWrite,
  isOwner,
  pages,
  currentPageId,
  updatedPageIds,
  user,
  online,
  pending,
  conflicts,
  syncing,
  onSync,
  onLogout,
}: Props) {
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);

  return (
    <nav className="sb">
      <div style={{ position: "relative" }}>
        <button className="ws-switch" onClick={() => setSwitcherOpen((o) => !o)}>
          <span className="ws-logo">{(current?.name ?? "?").charAt(0).toUpperCase()}</span>
          <span className="sb-item-label" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
            {current?.name ?? "Espaces"}
          </span>
          <Icon name="chevronDown" size={14} />
        </button>
        {switcherOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 20,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow)",
              padding: 4,
            }}
          >
            {workspaces.map((w) => (
              <button
                key={w.id}
                className={`sb-item${w.slug === current?.slug ? " active" : ""}`}
                onClick={() => {
                  setSwitcherOpen(false);
                  navigate(`/w/${w.slug}`);
                }}
              >
                <span className="ws-logo" style={{ width: 16, height: 16, fontSize: 8 }}>
                  {w.name.charAt(0).toUpperCase()}
                </span>
                <span className="label">{w.name}</span>
              </button>
            ))}
            <button
              className="sb-item"
              onClick={() => {
                setSwitcherOpen(false);
                setNewWsOpen(true);
              }}
            >
              <Icon name="plus" size={13} />
              <span className="label">Nouvel espace</span>
            </button>
          </div>
        )}
      </div>

      {current && (
        <Link to={`/w/${current.slug}`} className="sb-item">
          <Icon name="home" size={13} />
          <span className="label">Accueil</span>
        </Link>
      )}
      {current && isOwner && (
        <button className="sb-item" onClick={() => setSettingsTab("members")}>
          <Icon name="users" size={13} />
          <span className="label">Inviter des membres</span>
        </button>
      )}
      {current && isOwner && (
        <button className="sb-item" onClick={() => setSettingsTab("general")}>
          <Icon name="settings" size={13} />
          <span className="label">Réglages de l'espace</span>
        </button>
      )}

      <div className="sb-label" style={{ display: "flex", alignItems: "center" }}>
        <span style={{ flex: 1 }}>{current?.name ?? "Pages"}</span>
        {current && canWrite && (
          <button
            className="icon-btn"
            style={{ width: 22, height: 22 }}
            title="Nouvelle page"
            onClick={() => setNewPageOpen(true)}
          >
            <Icon name="plus" size={14} />
          </button>
        )}
      </div>
      {pages.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "4px 8px" }}>
          Aucune page pour l'instant.
        </div>
      )}
      {pages.map((p) => (
        <Link
          key={p.id}
          to={`/w/${current?.slug}/${p.id}`}
          className={`sb-item${p.id === currentPageId ? " active" : ""}`}
        >
          <Icon name="file" size={13} />
          <span className="label">{p.title}</span>
          {updatedPageIds.has(p.id) && <span className="badge-maj">MàJ</span>}
        </Link>
      ))}

      <SyncButton
        online={online}
        pending={pending}
        conflicts={conflicts}
        syncing={syncing}
        onSync={onSync}
      />

      <div className="sb-user">
        {user && <Avatar seed={user.email} label={user.display_name || user.email} size={24} className="av-me" />}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user?.display_name || user?.email || "—"}
        </span>
        <ThemeToggle />
        {user?.is_system_admin && (
          <button
            className="icon-btn"
            onClick={() => navigate("/admin")}
            title="Administration système"
            aria-label="Administration système"
          >
            <Icon name="shield" size={16} />
          </button>
        )}
        <button className="icon-btn" onClick={() => navigate("/help")} title="Aide" aria-label="Aide">
          <Icon name="help" size={16} />
        </button>
        <button className="icon-btn" onClick={() => navigate("/settings")} title="Paramètres" aria-label="Paramètres">
          <Icon name="settings" size={16} />
        </button>
        <button className="icon-btn" onClick={onLogout} title="Se déconnecter" aria-label="Se déconnecter">
          <Icon name="logout" size={16} />
        </button>
      </div>

      {newPageOpen && current && (
        <NewPageModal
          workspaceId={current.id}
          workspaceSlug={current.slug}
          onClose={() => setNewPageOpen(false)}
          onCreated={(pageId) => {
            setNewPageOpen(false);
            navigate(`/w/${current.slug}/${pageId}`);
          }}
        />
      )}
      {newWsOpen && (
        <NewWorkspaceModal
          onClose={() => setNewWsOpen(false)}
          onCreated={(slug) => {
            setNewWsOpen(false);
            navigate(`/w/${slug}`);
          }}
        />
      )}
      {settingsTab && current && (
        <WorkspaceSettingsModal
          workspace={current}
          initialTab={settingsTab}
          onClose={() => setSettingsTab(null)}
          onDeleted={() => {
            setSettingsTab(null);
            navigate("/");
          }}
        />
      )}
    </nav>
  );
}
