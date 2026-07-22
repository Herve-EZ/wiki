import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { exportPdf } from "../lib/export/pdf";
import { markdownToDocx } from "../lib/export/docx";
import { exportMarkdown, saveBinaryFile } from "../lib/native";
import { descendantIds } from "../lib/pageTree";
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
      <Icon name="bell" size={13} />
      {subscribed ? "Suivi" : "Suivre"}
    </button>
  );
}

const STATUS_LABEL: Record<PageStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

interface Props {
  page: Page;
  canWrite: boolean;
  isOwner: boolean;
  online: boolean;
  pages: PageListItem[];
  onChangeStatus: (status: PageStatus) => void;
  onMove: (parentId: string | null) => void;
  onDelete: () => void;
  pushToast: (t: string) => void;
}

/** Header controls for a page: publication status, workflow stage and deletion.
 * Publishing/archiving and deleting are owner-only (also enforced server-side). */
export function PageActions({
  page,
  canWrite,
  isOwner,
  online,
  pages,
  onChangeStatus,
  onMove,
  onDelete,
  pushToast,
}: Props) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  // Valid parents: any page that is not this page or one of its descendants.
  const blocked = descendantIds(pages, page.id);
  const moveTargets = pages.filter((p) => !blocked.has(p.id));

  const baseName = page.slug || "page";

  // Native menu (desktop): Fichier → Exporter la page… opens the export menu.
  useEffect(() => {
    const onExport = () => setExportOpen(true);
    window.addEventListener("menu:export-page", onExport);
    return () => window.removeEventListener("menu:export-page", onExport);
  }, []);

  function doPdf() {
    setExportOpen(false);
    exportPdf(page.title, page.content_md);
  }
  async function doDocx() {
    setExportOpen(false);
    try {
      const data = await markdownToDocx(page.content_md);
      await saveBinaryFile(`${baseName}.docx`, data, [{ name: "Word", extensions: ["docx"] }]);
    } catch {
      pushToast("Échec de l'export Word.");
    }
  }
  async function doMd() {
    setExportOpen(false);
    try {
      await exportMarkdown(`${baseName}.md`, page.content_md);
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
      {canWrite ? (
        <select
          className="input status-select"
          value={page.status}
          onChange={(e) => onChangeStatus(e.target.value as PageStatus)}
          title="Statut de la page"
        >
          <option value="draft">Brouillon</option>
          <option value="published" disabled={!isOwner}>Publié</option>
          <option value="archived" disabled={!isOwner}>Archivé</option>
        </select>
      ) : (
        <span className="ed-status">
          <Icon name="check" size={11} /> {STATUS_LABEL[page.status]}
        </span>
      )}

      {workflow && (
        <span className="wf-badge" title={`Workflow : ${workflow.workflow_name}`}>
          <Icon name="refresh" size={11} />
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

      <span className="page-actions-right">
        <div className="export-menu">
          <button className="btn btn-ghost" onClick={() => setExportOpen((o) => !o)}>
            <Icon name="download" size={13} /> Exporter
          </button>
          {exportOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setExportOpen(false)} />
              <div className="menu-pop">
                <button className="menu-item" onClick={doPdf}>
                  <Icon name="file" size={13} /> PDF (impression)
                </button>
                <button className="menu-item" onClick={() => void doDocx()}>
                  <Icon name="file" size={13} /> Word (.docx)
                </button>
                <button className="menu-item" onClick={() => void doMd()}>
                  <Icon name="download" size={13} /> Markdown (.md)
                </button>
              </div>
            </>
          )}
        </div>

        {canWrite && online && (
          <div className="export-menu">
            <button className="btn btn-ghost" onClick={() => setMoveOpen((o) => !o)} title="Déplacer dans l'arborescence">
              <Icon name="file" size={13} /> Déplacer
            </button>
            {moveOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setMoveOpen(false)} />
                <div className="menu-pop menu-pop-scroll">
                  <button
                    className="menu-item"
                    disabled={!page.parent}
                    onClick={() => {
                      setMoveOpen(false);
                      onMove(null);
                    }}
                  >
                    <Icon name="home" size={13} /> Racine (aucun parent)
                  </button>
                  {moveTargets.map((p) => (
                    <button
                      key={p.id}
                      className="menu-item"
                      disabled={p.id === page.parent}
                      onClick={() => {
                        setMoveOpen(false);
                        onMove(p.id);
                      }}
                    >
                      <Icon name="file" size={13} /> {p.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {isOwner &&
          (!confirmDelete ? (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              <Icon name="x" size={13} /> Supprimer
            </button>
          ) : (
            <span style={{ display: "inline-flex", gap: 6 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={onDelete}>
                Confirmer
              </button>
            </span>
          ))}
      </span>
    </div>
  );
}
