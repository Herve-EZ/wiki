import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import type { PresentUser } from "../hooks/usePageSocket";

interface Props {
  workspaceName: string;
  workspaceSlug?: string;
  /** Title of the page being read, when the route has one. */
  pageTitle?: string;
  onOpenSearch: () => void;
  /** Opens the navigation drawer; only shown below the drawer breakpoint. */
  onToggleNav: () => void;
  /** Receives the element that routes fill through `<PageBar>`. */
  slotRef: (el: HTMLDivElement | null) => void;
}

/**
 * The app's single band of chrome. It lives in `WorkspaceLayout`, so the
 * breadcrumb and the search box are on every route — the search entry point
 * used to disappear as soon as you left a page.
 *
 * Route-specific controls (save state, presence, page actions) are injected
 * into the slot by `<PageBar>` rather than passed down through props, so the
 * layout stays unaware of what a page needs.
 */
export function TopBar({
  workspaceName,
  workspaceSlug,
  pageTitle,
  onOpenSearch,
  onToggleNav,
  slotRef,
}: Props) {
  return (
    <header className="tb">
      <button
        className="icon-btn tb-nav-toggle"
        onClick={onToggleNav}
        title="Navigation"
        aria-label="Ouvrir la navigation"
      >
        <Icon name="menu" size="md" />
      </button>

      <nav className="crumb" aria-label="Fil d'Ariane">
        <Icon name="book" size="sm" style={{ color: "var(--ink-3)" }} />
        {workspaceSlug ? (
          <Link to={`/w/${workspaceSlug}`} className="crumb-link">
            {workspaceName}
          </Link>
        ) : (
          <span>{workspaceName}</span>
        )}
        {pageTitle && (
          <>
            <span className="sep">/</span>
            <span className="cur">{pageTitle}</span>
          </>
        )}
      </nav>

      <div className="tb-right">
        <div className="tb-slot" ref={slotRef} />
        <button className="searchbox" onClick={onOpenSearch}>
          <Icon name="search" size="sm" />
          Rechercher
          <span className="kbd">Ctrl K</span>
        </button>
      </div>
    </header>
  );
}

interface PageBarProps {
  /** Slot element from the layout; null for one frame on first mount. */
  host: HTMLElement | null;
  saving: boolean;
  versionLabel?: string;
  online: boolean;
  present: PresentUser[];
  lockCount: number;
  commentCount: number;
  onOpenComments: () => void;
  onOpenHistory: () => void;
}

/**
 * Page-level controls, rendered into the top bar's slot. This is what replaced
 * the bottom presence band: a live dot, the avatars of whoever is here, and a
 * lock chip when sections are being edited — a row of chips instead of a whole
 * horizontal strip spent on one sentence.
 */
export function PageBar({
  host,
  saving,
  versionLabel,
  online,
  present,
  lockCount,
  commentCount,
  onOpenComments,
  onOpenHistory,
}: PageBarProps) {
  if (!host) return null;

  const names = present.map((u) => u.display_name || u.email).join(", ");

  return createPortal(
    <>
      <span className="save-state">
        {saving ? (
          <>
            <span className="spinner" style={{ width: 12, height: 12 }} /> Enregistrement…
          </>
        ) : (
          <>
            <Icon name="check" size="xs" className="ic ok" /> Enregistré
            {versionLabel ? ` · ${versionLabel}` : ""}
          </>
        )}
      </span>

      {online ? (
        <span
          className="dot-live"
          role="img"
          aria-label={
            present.length > 0
              ? `Temps réel actif — ${names} sur cette page`
              : "Temps réel actif — vous êtes seul sur cette page"
          }
          title={present.length > 0 ? `Sur cette page : ${names}` : "Vous êtes seul sur cette page"}
        />
      ) : (
        <span className="lock-badge" title="Le serveur temps réel est injoignable">
          <Icon name="wifiOff" size="xs" />
          Mode dégradé
        </span>
      )}

      {present.length > 0 && (
        <div className="avatars">
          {present.slice(0, 4).map((u) => (
            <Avatar
              key={u.user_id}
              seed={u.email}
              label={u.display_name || u.email}
              src={u.avatar_url || undefined}
            />
          ))}
        </div>
      )}

      {lockCount > 0 && (
        <span className="lock-badge">
          <Icon name="lock" size="xs" />
          {lockCount} section{lockCount > 1 ? "s" : ""} verrouillée{lockCount > 1 ? "s" : ""}
        </span>
      )}

      <button className="btn btn-ghost" onClick={onOpenComments}>
        <Icon name="comment" size="sm" />
        Commentaires
        {commentCount > 0 && <span className="tb-badge">{commentCount}</span>}
      </button>

      <button className="btn btn-ghost" onClick={onOpenHistory}>
        <Icon name="history" size="sm" />
        Historique
      </button>
    </>,
    host,
  );
}
