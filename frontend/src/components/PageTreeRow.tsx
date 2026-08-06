import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { Icon } from "./Icon";
import { pushGlobalToast } from "./ToastContainer";
import type { PageListItem } from "../lib/types";

function fail(message: string) {
  pushGlobalToast(message, "alert");
}

/** What the row's ⋯ menu is showing. */
type MenuView = "closed" | "root" | "delete";

/** Where to pin the viewport-anchored menu, and which way it opens. */
interface MenuAnchor {
  x: number;
  y: number;
  flipUp: boolean;
}

/**
 * Width the widest view of the menu needs (the delete confirmation), plus a
 * margin. The menu hangs to the left of its anchor, and the sidebar is narrower
 * than this — without the clamp the panel runs off the left edge of the window
 * and the confirmation text gets cut in half.
 */
const MENU_SPACE = 288;

interface Props {
  page: PageListItem;
  depth: number;
  /** Pixels of indentation per level, matching `.sb-guide` in index.css. */
  indent: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  isCurrent: boolean;
  updated: boolean;
  workspaceSlug?: string;
  canWrite: boolean;
  isOwner: boolean;
  onToggleCollapse: () => void;
  onNewSubpage: () => void;
}

/**
 * One row of the page tree: indent guides, twisty, link, and the actions that
 * belong to the page itself. Renaming happens in place — the row becomes an
 * input — rather than in a modal, because you are already looking at the name.
 */
export function PageTreeRow({
  page,
  depth,
  indent,
  hasChildren,
  isCollapsed,
  isCurrent,
  updated,
  workspaceSlug,
  canWrite,
  isOwner,
  onToggleCollapse,
  onNewSubpage,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState<MenuView>("closed");
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // The tree scrolls, so the menu can't be a normal absolute child — it would
  // be clipped by `.sb-scroll`. It is placed against the viewport instead,
  // anchored to the button's rect at the moment it opens.
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  // A viewport-anchored menu would drift away from its row on scroll.
  useEffect(() => {
    if (view === "closed") return;
    const close = () => setView("closed");
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [view]);

  function openMenu(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    // Flip upward when there isn't room below for a menu of ~200px.
    const below = window.innerHeight - r.bottom > 220;
    setAnchor({
      // Right-aligned on the button, but never so far left that the panel
      // leaves the window.
      x: Math.min(Math.max(r.right, MENU_SPACE), window.innerWidth - 8),
      y: below ? r.bottom + 4 : r.top - 4,
      flipUp: !below,
    });
    setView("root");
  }

  const menuStyle: React.CSSProperties | undefined = anchor
    ? {
        position: "fixed",
        top: anchor.y,
        left: anchor.x,
        right: "auto",
        bottom: "auto",
        transform: anchor.flipUp ? "translate(-100%, -100%)" : "translateX(-100%)",
      }
    : undefined;

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["pages", workspaceSlug] });
    void qc.invalidateQueries({ queryKey: ["page", page.id] });
  }

  const renameM = useMutation({
    mutationFn: (title: string) => api.updatePage(page.id, { title }),
    onSuccess: refresh,
    onError: (err) =>
      fail(
        err instanceof ApiError && err.status === 403
          ? "Votre rôle ne permet pas de renommer cette page."
          : "Renommage impossible.",
      ),
  });

  const moveToRootM = useMutation({
    mutationFn: () => api.updatePage(page.id, { parent: null }),
    onSuccess: refresh,
    onError: () => fail("Déplacement impossible."),
  });

  const deleteM = useMutation({
    mutationFn: () => api.deletePage(page.id),
    onSuccess: () => {
      refresh();
      // The page we were reading just left; don't stay on a dead route.
      if (isCurrent) navigate(workspaceSlug ? `/w/${workspaceSlug}` : "/");
    },
    onError: (err) =>
      fail(
        err instanceof ApiError && err.status === 403
          ? "Seul le propriétaire peut supprimer cette page."
          : "Suppression impossible.",
      ),
  });

  function commitRename(value: string) {
    const next = value.trim();
    setRenaming(false);
    if (next && next !== page.title) renameM.mutate(next);
  }

  return (
    <div className={`sb-tree-row${isCurrent ? " current" : ""}`}>
      {depth > 0 && (
        <span className="sb-guides" aria-hidden="true">
          {Array.from({ length: depth }, (_, i) => (
            <span key={i} className="sb-guide" style={{ width: indent }} />
          ))}
        </span>
      )}

      <button
        className={`sb-twisty${hasChildren ? "" : " hidden"}`}
        title={isCollapsed ? "Déplier" : "Replier"}
        aria-label={isCollapsed ? "Déplier" : "Replier"}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        onClick={onToggleCollapse}
      >
        <Icon name="chevronDown" size="sm" className={`sb-caret${isCollapsed ? " closed" : ""}`} />
      </button>

      {renaming ? (
        <input
          ref={inputRef}
          className="sb-rename"
          defaultValue={page.title}
          aria-label={`Renommer « ${page.title} »`}
          onBlur={(e) => commitRename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename((e.target as HTMLInputElement).value);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setRenaming(false);
            }
          }}
        />
      ) : (
        <Link
          to={`/w/${workspaceSlug}/${page.id}`}
          className={`sb-item sb-tree-item${isCurrent ? " active" : ""}`}
          aria-current={isCurrent ? "page" : undefined}
        >
          {updated && (
            <span className="dot-maj" title="Mise à jour depuis votre dernière visite" />
          )}
          <Icon name="file" size="md" />
          <span className="label">{page.title}</span>
        </Link>
      )}

      {canWrite && !renaming && (
        <div className="sb-row-menu">
          <button
            className="icon-btn sb-row-add"
            title={`Actions pour « ${page.title} »`}
            aria-label={`Actions pour ${page.title}`}
            aria-haspopup="menu"
            aria-expanded={view !== "closed"}
            onClick={(e) => (view === "closed" ? openMenu(e) : setView("closed"))}
          >
            <Icon name="more" size="sm" />
          </button>

          {view !== "closed" && (
            <>
              <div className="menu-backdrop" onClick={() => setView("closed")} />

              {view === "root" && (
                <div className="menu-pop" role="menu" style={menuStyle}>
                  <button
                    className="menu-item"
                    onClick={() => {
                      setView("closed");
                      onNewSubpage();
                    }}
                  >
                    <Icon name="filePlus" size="sm" /> Nouvelle sous-page
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => {
                      setView("closed");
                      setRenaming(true);
                    }}
                  >
                    <Icon name="pencil" size="sm" /> Renommer
                  </button>
                  {page.parent && (
                    <button
                      className="menu-item"
                      onClick={() => {
                        setView("closed");
                        moveToRootM.mutate();
                      }}
                    >
                      <Icon name="home" size="sm" /> Remonter à la racine
                    </button>
                  )}
                  {isOwner && (
                    <>
                      <div className="ws-menu-sep" />
                      <button className="menu-item danger" onClick={() => setView("delete")}>
                        <Icon name="trash" size="sm" /> Supprimer…
                      </button>
                    </>
                  )}
                </div>
              )}

              {view === "delete" && (
                <div
                  className="menu-pop menu-confirm"
                  role="dialog"
                  aria-label="Confirmer la suppression"
                  style={menuStyle}
                >
                  <p className="menu-confirm-text">
                    Supprimer <b>« {page.title} »</b> ? La page part à la corbeille de
                    l'espace{hasChildren ? ", ses sous-pages avec elle" : ""}.
                  </p>
                  <div className="menu-confirm-actions">
                    <button className="btn btn-ghost" onClick={() => setView("root")}>
                      Annuler
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={deleteM.isPending}
                      onClick={() => {
                        setView("closed");
                        deleteM.mutate();
                      }}
                    >
                      <Icon name="trash" size="sm" /> Supprimer
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
