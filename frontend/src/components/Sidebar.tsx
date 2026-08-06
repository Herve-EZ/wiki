import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { NotificationBell } from "./NotificationBell";
import { NewPageModal } from "./modals/NewPageModal";
import { NewWorkspaceModal } from "./modals/NewWorkspaceModal";
import { TrashModal } from "./modals/TrashModal";
import { SyncButton } from "./SyncButton";
import {
  WorkspaceSettingsModal,
  type SettingsTab,
} from "./modals/WorkspaceSettingsModal";
import { useTheme } from "../hooks/useTheme";
import { buildPageTree, flattenVisible } from "../lib/pageTree";
import type { PageListItem, Role, User, Workspace } from "../lib/types";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  editor: "Éditeur",
  viewer: "Lecteur",
};

const THEME_LABEL = {
  light: "Thème clair",
  dark: "Thème sombre",
  system: "Thème système",
} as const;

// Rail geometry. Width is a user preference, so it survives reloads.
const WIDTH_KEY = "wikicollab.sidebar.width";
const MIN_WIDTH = 208;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 264;
/** One level of tree indentation, matching `.sb-guide` in index.css. */
const INDENT = 14;

function readWidth(): number {
  const n = Number(localStorage.getItem(WIDTH_KEY));
  return Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH ? n : DEFAULT_WIDTH;
}

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
  /** Wide screens: false shows the icon rail. Narrow: false hides the drawer. */
  navOpen: boolean;
  /** True below the drawer breakpoint — the shape changes, not just the style. */
  narrow: boolean;
  onToggleNav: () => void;
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
  navOpen,
  narrow,
  onToggleNav,
  onSync,
  onLogout,
}: Props) {
  const navigate = useNavigate();
  const { theme, cycle: cycleTheme } = useTheme();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newPage, setNewPage] = useState<{ parentId?: string; parentTitle?: string } | null>(null);
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [width, setWidth] = useState(readWidth);

  const tree = buildPageTree(pages);
  const visible = flattenVisible(tree, collapsed);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function persistWidth(next: number) {
    localStorage.setItem(WIDTH_KEY, String(next));
    setWidth(next);
  }

  /** Drag the separator. Pointer events so a pen or touch works too. */
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    let last = startWidth;

    function onMove(ev: PointerEvent) {
      last = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + ev.clientX - startX));
      setWidth(last);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.classList.remove("is-resizing");
      persistWidth(last);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.classList.add("is-resizing");
  }

  /** Same handle, keyboard version — a separator has to be operable without a mouse. */
  function onResizeKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 48 : 16;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      persistWidth(Math.max(MIN_WIDTH, width - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      persistWidth(Math.min(MAX_WIDTH, width + step));
    }
  }

  const profileName = user?.display_name || user?.email || "—";
  const themeIcon = theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor";

  // ---- Collapsed on a wide screen: an icon rail. The tree is meaningless
  // without labels, so it makes way for the actions that still read as icons.
  // Below the drawer breakpoint there is no rail — the nav is simply off-canvas.
  if (!navOpen && !narrow) {
    return (
      <nav className="sb sb-rail" aria-label="Navigation">
        <button
          className="icon-btn"
          onClick={onToggleNav}
          title="Déplier la barre latérale (Ctrl + \)"
          aria-label="Déplier la barre latérale"
        >
          <Icon name="chevronRight" size="md" />
        </button>

        {current && (
          <Link to={`/w/${current.slug}`} className="icon-btn" title={current.name}>
            <span className="ws-logo">{current.name.charAt(0).toUpperCase()}</span>
          </Link>
        )}
        {current && canWrite && (
          <button
            className="icon-btn"
            onClick={() => setNewPage({})}
            title="Nouvelle page"
            aria-label="Nouvelle page"
          >
            <Icon name="plus" size="md" />
          </button>
        )}

        <div className="sb-rail-spacer" />

        <NotificationBell />
        <button
          className="icon-btn"
          onClick={() => navigate("/settings")}
          title={`${profileName} — profil et paramètres`}
          aria-label="Profil et paramètres"
        >
          {user ? (
            <Avatar
              seed={user.email}
              label={profileName}
              src={user.avatar_url || undefined}
              size={24}
              className="av-me"
            />
          ) : (
            <Icon name="user" size="md" />
          )}
        </button>

        {newPage && current && (
          <NewPageModal
            workspaceId={current.id}
            workspaceSlug={current.slug}
            parentId={newPage.parentId}
            parentTitle={newPage.parentTitle}
            onClose={() => setNewPage(null)}
            onCreated={(pageId) => {
              setNewPage(null);
              navigate(`/w/${current.slug}/${pageId}`);
            }}
          />
        )}
      </nav>
    );
  }

  return (
    <nav
      className={`sb${narrow ? " sb-drawer" : ""}${navOpen ? " open" : ""}`}
      style={narrow ? undefined : { width }}
      aria-label="Navigation"
      aria-hidden={narrow && !navOpen}
      inert={narrow && !navOpen ? true : undefined}
    >
      {/* ---- Fixed header: workspace switcher + primary links ---- */}
      <div className="sb-top">
        <div style={{ position: "relative" }}>
          <button
            className={`ws-switch${switcherOpen ? " open" : ""}`}
            onClick={() => setSwitcherOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={switcherOpen}
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
            <Icon name="chevronDown" size="md" />
          </button>
          {switcherOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setSwitcherOpen(false)} />
              <div className="ws-menu" role="menu">
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
                    {w.slug === current?.slug && <Icon name="check" size="sm" style={{ marginLeft: "auto" }} />}
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
                  <Icon name="plus" size="sm" />
                  <span className="label">Nouvel espace</span>
                </button>
                {current && isOwner && (
                  <button
                    className="sb-item"
                    onClick={() => {
                      setSwitcherOpen(false);
                      setTrashOpen(true);
                    }}
                  >
                    <Icon name="trash" size="sm" />
                    <span className="label">Corbeille de l'espace</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {current && (
          <Link to={`/w/${current.slug}`} className="sb-item">
            <Icon name="home" size="md" />
            <span className="label">Accueil</span>
          </Link>
        )}
        {current && isOwner && (
          <button className="sb-item" onClick={() => setSettingsTab("members")}>
            <Icon name="users" size="md" />
            <span className="label">Inviter des membres</span>
          </button>
        )}
        {current && isOwner && (
          <button className="sb-item" onClick={() => setSettingsTab("general")}>
            <Icon name="settings" size="md" />
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
              onClick={() => setNewPage({})}
            >
              <Icon name="plus" size="md" />
            </button>
          )}
        </div>
        {pages.length === 0 && (
          <div className="sb-empty">
            <Icon name="file" size="lg" />
            <span>Aucune page pour l'instant.</span>
            {current && canWrite && (
              <button className="link" onClick={() => setNewPage({})}>
                Créer la première page
              </button>
            )}
          </div>
        )}
        {visible.map((node) => {
          const p = node.page;
          const hasChildren = node.children.length > 0;
          const isCollapsed = collapsed.has(p.id);
          const isCurrent = p.id === currentPageId;
          return (
            <div key={p.id} className={`sb-tree-row${isCurrent ? " current" : ""}`}>
              {/* Indent guides: one rule per level, so depth is readable. */}
              {node.depth > 0 && (
                <span className="sb-guides" aria-hidden="true">
                  {Array.from({ length: node.depth }, (_, i) => (
                    <span key={i} className="sb-guide" style={{ width: INDENT }} />
                  ))}
                </span>
              )}
              <button
                className={`sb-twisty${hasChildren ? "" : " hidden"}`}
                title={isCollapsed ? "Déplier" : "Replier"}
                aria-label={isCollapsed ? "Déplier" : "Replier"}
                aria-expanded={hasChildren ? !isCollapsed : undefined}
                onClick={() => toggleCollapse(p.id)}
              >
                <Icon name="chevronDown" size="sm" className={`sb-caret${isCollapsed ? " closed" : ""}`} />
              </button>
              <Link
                to={`/w/${current?.slug}/${p.id}`}
                className={`sb-item sb-tree-item${isCurrent ? " active" : ""}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {updatedPageIds.has(p.id) && (
                  <span className="dot-maj" title="Mise à jour depuis votre dernière visite" />
                )}
                <Icon name="file" size="md" />
                <span className="label">{p.title}</span>
              </Link>
              {current && canWrite && (
                <button
                  className="icon-btn sb-row-add"
                  title={`Nouvelle sous-page dans « ${p.title} »`}
                  aria-label={`Nouvelle sous-page dans ${p.title}`}
                  onClick={() => setNewPage({ parentId: p.id, parentTitle: p.title })}
                >
                  <Icon name="plus" size="sm" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- Sync status (always visible) ---- */}
      <SyncButton
        online={online}
        pending={pending}
        conflicts={conflicts}
        syncing={syncing}
        onSync={onSync}
      />

      {/* ---- Footer: one profile menu instead of a row of icon buttons ---- */}
      <div className="sb-foot">
        <div className="sb-profile-wrap">
          <button
            className="sb-profile"
            onClick={() => setProfileOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            {user && (
              <Avatar
                seed={user.email}
                label={profileName}
                src={user.avatar_url || undefined}
                size={32}
                className="av-me"
              />
            )}
            <span className="sb-profile-meta">
              <span className="sb-profile-name">{profileName}</span>
              {user?.display_name && user?.email && (
                <span className="sb-profile-mail">{user.email}</span>
              )}
            </span>
            <Icon name="chevronDown" size="sm" style={{ color: "var(--ink-3)" }} />
          </button>

          {profileOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setProfileOpen(false)} />
              <div className="menu-pop sb-profile-menu" role="menu">
                <button
                  className="menu-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/settings");
                  }}
                >
                  <Icon name="settings" size="sm" /> Paramètres
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/help");
                  }}
                >
                  <Icon name="help" size="sm" /> Aide
                </button>
                {user?.is_system_admin && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/admin");
                    }}
                  >
                    <Icon name="shield" size="sm" /> Administration système
                  </button>
                )}
                <div className="ws-menu-sep" />
                <button className="menu-item" onClick={cycleTheme}>
                  <Icon name={themeIcon} size="sm" /> {THEME_LABEL[theme]}
                </button>
                <div className="ws-menu-sep" />
                <button className="menu-item danger" onClick={onLogout}>
                  <Icon name="logout" size="sm" /> Se déconnecter
                </button>
              </div>
            </>
          )}
        </div>

        <div className="sb-foot-actions">
          <NotificationBell />
          <button
            className="icon-btn"
            onClick={onToggleNav}
            title={narrow ? "Fermer la navigation" : "Replier la barre latérale (Ctrl + \\)"}
            aria-label={narrow ? "Fermer la navigation" : "Replier la barre latérale"}
          >
            <Icon name="chevronLeft" size="md" />
          </button>
        </div>
      </div>

      {/* Drag to resize; arrow keys work too. Pointless in the drawer. */}
      {!narrow && (
        <div
          className="sb-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Largeur de la barre latérale"
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={onResizeKey}
          onDoubleClick={() => persistWidth(DEFAULT_WIDTH)}
        />
      )}

      {newPage && current && (
        <NewPageModal
          workspaceId={current.id}
          workspaceSlug={current.slug}
          parentId={newPage.parentId}
          parentTitle={newPage.parentTitle}
          onClose={() => setNewPage(null)}
          onCreated={(pageId) => {
            setNewPage(null);
            navigate(`/w/${current.slug}/${pageId}`);
          }}
        />
      )}
      {trashOpen && current && (
        <TrashModal workspaceSlug={current.slug} onClose={() => setTrashOpen(false)} />
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
