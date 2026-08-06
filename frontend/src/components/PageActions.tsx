import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { exportPdf } from "../lib/export/pdf";
import { markdownToDocx } from "../lib/export/docx";
import { exportMarkdown, saveBinaryFile } from "../lib/native";
import { descendantIds } from "../lib/pageTree";
import { expandTransclusions, type TranscludeMap } from "../lib/transclude";
import type { Page, PageListItem, PageStatus } from "../lib/types";
import { Icon } from "./Icon";

function FollowButton({ pageId, online }: { pageId: string; online: boolean }) {
  const qc = useQueryClient();
  const subQ = useQuery({
    queryKey: ["page-sub", pageId],
    queryFn: () => api.pageSubscription(pageId),
    enabled: online,
  });
  const subscribed = subQ.data?.subscribed ?? false;

  const toggleM = useMutation({
    mutationFn: () => (subscribed ? api.unsubscribePage(pageId) : api.subscribePage(pageId)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["page-sub", pageId] }),
  });

  if (!online) return null;

  return (
    <button
      className={`btn btn-ghost follow-btn${subscribed ? " following" : ""}`}
      onClick={() => toggleM.mutate()}
      disabled={toggleM.isPending}
      title={subscribed ? "Ne plus suivre" : "Suivre cette page"}
    >
      <Icon name="bell" size="sm" />
      {subscribed ? "Suivi" : "Suivre"}
    </button>
  );
}

const STATUS_LABEL: Record<PageStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const STATUSES: PageStatus[] = ["draft", "published", "archived"];

/** What the ⋯ menu is showing: its root, the move target list, or the
 * confirmation for a deletion. */
type MenuView = "root" | "move" | "delete";

interface Props {
  page: Page;
  canWrite: boolean;
  isOwner: boolean;
  online: boolean;
  pages: PageListItem[];
  /** Resolved `![[…]]` includes, expanded inline so exports stand alone. */
  transclusions?: TranscludeMap;
  onChangeStatus: (status: PageStatus) => void;
  onMove: (parentId: string | null) => void;
  onDelete: () => void;
  pushToast: (t: string) => void;
}

/**
 * The controls that sit on the page's title row. Everything that isn't used on
 * every visit — export, move, delete — lives behind a single ⋯ menu, and the
 * destructive action is last, separated, and confirmed by name. The row used to
 * be six controls wide, above the title, with a permanent red button.
 *
 * Publishing/archiving and deleting are owner-only (enforced server-side too).
 */
export function PageActions({
  page,
  canWrite,
  isOwner,
  online,
  pages,
  transclusions,
  onChangeStatus,
  onMove,
  onDelete,
  pushToast,
}: Props) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<MenuView>("root");

  // Valid parents: any page that is not this page or one of its descendants.
  const blocked = descendantIds(pages, page.id);
  const moveTargets = pages.filter((p) => !blocked.has(p.id));

  const baseName = page.slug || "page";
  // Exports carry the included content itself — a `![[…]]` reference would be
  // meaningless in a PDF or a Word file.
  const exportMd = transclusions
    ? expandTransclusions(page.content_md, transclusions)
    : page.content_md;

  function openMenu() {
    setView("root");
    setMenuOpen(true);
  }
  function closeMenu() {
    setMenuOpen(false);
    setView("root");
  }

  // Native menu (desktop): Fichier → Exporter la page… opens the menu.
  useEffect(() => {
    const onExport = () => {
      setView("root");
      setMenuOpen(true);
    };
    window.addEventListener("menu:export-page", onExport);
    return () => window.removeEventListener("menu:export-page", onExport);
  }, []);

  async function doPdf() {
    closeMenu();
    try {
      await exportPdf(page.title, exportMd);
    } catch {
      pushToast("Échec de la préparation du PDF.");
    }
  }
  async function doDocx() {
    closeMenu();
    try {
      const data = await markdownToDocx(exportMd);
      await saveBinaryFile(`${baseName}.docx`, data, [{ name: "Word", extensions: ["docx"] }]);
    } catch {
      pushToast("Échec de l'export Word.");
    }
  }
  async function doMd() {
    closeMenu();
    try {
      await exportMarkdown(`${baseName}.md`, exportMd);
    } catch {
      pushToast("Échec de l'export Markdown.");
    }
  }

  const wfQ = useQuery({
    queryKey: ["page-workflow", page.id],
    queryFn: () => api.getPageWorkflow(page.id),
    enabled: online,
  });
  const workflow = wfQ.data;

  const advanceM = useMutation({
    mutationFn: () => api.advancePageWorkflow(page.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["page-workflow", page.id] });
      void qc.invalidateQueries({ queryKey: ["page", page.id] });
    },
    onError: (err) =>
      pushToast(err instanceof ApiError ? err.detail : "Impossible de faire avancer."),
  });

  return (
    <div className="page-actions">
      {workflow && (
        <span className="wf-badge" title={`Workflow : ${workflow.workflow_name}`}>
          <Icon name="refresh" size="xs" />
          {workflow.current_stage_name ?? "—"}
          {canWrite && (
            <button
              className="link"
              style={{ marginLeft: 6 }}
              disabled={advanceM.isPending}
              onClick={() => advanceM.mutate()}
            >
              Faire avancer
            </button>
          )}
        </span>
      )}

      <FollowButton pageId={page.id} online={online} />

      <div className="export-menu">
        <button
          className="icon-btn"
          onClick={() => (menuOpen ? closeMenu() : openMenu())}
          title="Actions de la page"
          aria-label="Actions de la page"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <Icon name="more" size="md" />
        </button>

        {menuOpen && (
          <>
            <div className="menu-backdrop" onClick={closeMenu} />

            {view === "root" && (
              <div className="menu-pop" role="menu">
                {canWrite && (
                  <>
                    <p className="menu-label">Statut</p>
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        className="menu-item"
                        disabled={s !== "draft" && !isOwner}
                        onClick={() => {
                          closeMenu();
                          if (s !== page.status) onChangeStatus(s);
                        }}
                      >
                        <Icon
                          name="check"
                          size="sm"
                          style={{ opacity: s === page.status ? 1 : 0 }}
                        />
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                    <div className="ws-menu-sep" />
                  </>
                )}

                <p className="menu-label">Exporter</p>
                <button className="menu-item" onClick={() => void doPdf()}>
                  <Icon name="file" size="sm" /> PDF (impression)
                </button>
                <button className="menu-item" onClick={() => void doDocx()}>
                  <Icon name="file" size="sm" /> Word (.docx)
                </button>
                <button className="menu-item" onClick={() => void doMd()}>
                  <Icon name="download" size="sm" /> Markdown (.md)
                </button>

                {canWrite && online && (
                  <>
                    <div className="ws-menu-sep" />
                    <button className="menu-item" onClick={() => setView("move")}>
                      <Icon name="filePlus" size="sm" />
                      <span className="menu-item-label">Déplacer dans l'arborescence</span>
                      <Icon name="chevronRight" size="sm" style={{ color: "var(--ink-3)" }} />
                    </button>
                  </>
                )}

                {isOwner && (
                  <>
                    <div className="ws-menu-sep" />
                    <button className="menu-item danger" onClick={() => setView("delete")}>
                      <Icon name="trash" size="sm" /> Supprimer la page…
                    </button>
                  </>
                )}
              </div>
            )}

            {view === "move" && (
              <div className="menu-pop menu-pop-scroll" role="menu">
                <button className="menu-item" onClick={() => setView("root")}>
                  <Icon name="chevronLeft" size="sm" /> Déplacer vers…
                </button>
                <div className="ws-menu-sep" />
                <button
                  className="menu-item"
                  disabled={!page.parent}
                  onClick={() => {
                    closeMenu();
                    onMove(null);
                  }}
                >
                  <Icon name="home" size="sm" /> Racine (aucun parent)
                </button>
                {moveTargets.map((p) => (
                  <button
                    key={p.id}
                    className="menu-item"
                    disabled={p.id === page.parent}
                    onClick={() => {
                      closeMenu();
                      onMove(p.id);
                    }}
                  >
                    <Icon name="file" size="sm" />
                    <span className="menu-item-label">{p.title}</span>
                  </button>
                ))}
              </div>
            )}

            {view === "delete" && (
              <div className="menu-pop menu-confirm" role="dialog" aria-label="Confirmer la suppression">
                <p className="menu-confirm-text">
                  Supprimer <b>« {page.title} »</b> ? La page part à la corbeille de
                  l'espace, d'où un propriétaire peut la restaurer.
                </p>
                <div className="menu-confirm-actions">
                  <button className="btn btn-ghost" onClick={() => setView("root")}>
                    Annuler
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      closeMenu();
                      onDelete();
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
    </div>
  );
}
