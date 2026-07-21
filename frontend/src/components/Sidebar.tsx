import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { NotificationBell } from "./NotificationBell";
import { NewPageModal } from "./modals/NewPageModal";
import { NewWorkspaceModal } from "./modals/NewWorkspaceModal";
import { SyncButton } from "./SyncButton";
import {
  WorkspaceSettingsModal,
  type SettingsTab,
} from "./modals/WorkspaceSettingsModal";
import type { PageListItem, Role, User, Workspace } from "../lib/types";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  editor: "Éditeur",
  viewer: "Lecteur",
};

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
  role,
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
      {/* ---- Fixed header: workspace switcher + primary links ---- */}
      <div className="sb-top">
        <div style={{ position: "relative" }}>
          <button
            className={`ws-switch${switcherOpen ? " open" : ""}`}
            onClick={() => setSwitcherOpen((o) => !o)}
          >
            <span className="ws-logo">
              {(current?.name ?? "?").charAt(0).toUpperCase()}
            </span>
            <span className="ws-switch-meta">
              <span className="ws-switch-name">{current?.name ?? "Espaces"}</span>
              <span className="ws-switch-sub">
                {role ? ROLE_LABEL[role] : "Choisir un espace"}
              </span>
            </span>
            <Icon name="chevronDown" size={15} />
          </button>
          {switcherOpen && (
            <div className="ws-menu">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  className={`sb-item${w.slug === current?.slug ? " active" : ""}`}
                  onClick={() => {
                    setSwitcherOpen(false);
                    navigate(`/w/${w.slug}`);
                  }}
                >
                  <span className="ws-logo" style={{ width: 18, height: 18, fontSize: 9, borderRadius: 5 }}>
                    {w.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="label">{w.name}</span>
                  {w.slug === current?.slug && <Icon name="check" size={14} style={{ marginLeft: "auto" }} />}
                </button>
              ))}
              <div className="ws-menu-sep" />
              <button
                className="sb-item"
                onClick={() => {
                  setSwitcherOpen(false);
                  setNewWsOpen(true);
                }}
              >
                <Icon name="plus" size={14} />
                <span className="label">Nouvel espace</span>
              </button>
            </div>
          )}
        </div>

        {current && (
          <Link to={`/w/${current.slug}`} className="sb-item">
            <Icon name="home" size={15} />
            <span className="label">Accueil</span>
          </Link>
        )}
        {current && isOwner && (
          <button className="sb-item" onClick={() => setSettingsTab("members")}>
            <Icon name="users" size={15} />
            <span className="label">Inviter des membres</span>
          </button>
        )}
        {current && isOwner && (
          <button className="sb-item" onClick={() => setSettingsTab("general")}>
            <Icon name="settings" size={15} />
            <span className="label">Réglages de l'espace</span>
          </button>
        )}
      </div>

      {/* ---- Scrollable page list ---- */}
      <div className="sb-scroll">
        <div className="sb-label">
          <span className="sb-label-text">Pages</span>
          {pages.length > 0 && <span className="sb-count">{pages.length}</span>}
          {current && canWrite && (
            <button
              className="icon-btn sb-add"
              title="Nouvelle page"
              aria-label="Nouvelle page"
              onClick={() => setNewPageOpen(true)}
            >
              <Icon name="plus" size={15} />
            </button>
          )}
        </div>
        {pages.length === 0 && (
          <div className="sb-empty">
            <Icon name="file" size={22} />
            <span>Aucune page pour l'instant.</span>
            {current && canWrite && (
              <button className="link" onClick={() => setNewPageOpen(true)}>
                Créer la première page
              </button>
            )}
          </div>
        )}
        {pages.map((p) => (
          <Link
            key={p.id}
            to={`/w/${current?.slug}/${p.id}`}
            className={`sb-item${p.id === currentPageId ? " active" : ""}`}
          >
            <Icon name="file" size={15} />
            <span className="label">{p.title}</span>
            {updatedPageIds.has(p.id) && <span className="badge-maj">MàJ</span>}
          </Link>
        ))}
      </div>

      {/* ---- Sync status (always visible) ---- */}
      <SyncButton
        online={online}
        pending={pending}
        conflicts={conflicts}
        syncing={syncing}
        onSync={onSync}
      />

      {/* ---- Fixed footer: profile card + action toolbar ---- */}
      <div className="sb-foot">
        <button
          className="sb-profile"
          onClick={() => navigate("/settings")}
          title="Profil et paramètres"
        >
          {user && (
            <Avatar
              seed={user.email}
              label={user.display_name || user.email}
              src={user.avatar_url || undefined}
              size={32}
              className="av-me"
            />
          )}
          <span className="sb-profile-meta">
            <span className="sb-profile-name">
              {user?.display_name || user?.email || "—"}
            </span>
            {user?.display_name && user?.email && (
              <span className="sb-profile-mail">{user.email}</span>
            )}
          </span>
        </button>

        <div className="sb-foot-actions">
          <NotificationBell />
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
