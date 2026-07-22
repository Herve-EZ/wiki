import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Icon } from "../Icon";

interface Props {
  workspaceSlug: string;
  onClose: () => void;
}

/** Owner-only view of soft-deleted pages: restore or permanently delete. */
export function TrashModal({ workspaceSlug, onClose }: Props) {
  const qc = useQueryClient();
  const [confirmPurge, setConfirmPurge] = useState<string | null>(null);

  const trashQ = useQuery({
    queryKey: ["trash", workspaceSlug],
    queryFn: () => api.listTrash(workspaceSlug),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["trash", workspaceSlug] });
    void qc.invalidateQueries({ queryKey: ["pages", workspaceSlug] });
  };

  const restoreM = useMutation({
    mutationFn: (id: string) => api.untrashPage(id),
    onSuccess: refresh,
  });
  const purgeM = useMutation({
    mutationFn: (id: string) => api.purgePage(id),
    onSuccess: () => {
      setConfirmPurge(null);
      refresh();
    },
  });

  const items = trashQ.data ?? [];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" style={{ width: "min(560px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-title" style={{ marginBottom: 4 }}>
          <Icon name="x" size={16} />
          <h4 style={{ margin: 0 }}>Corbeille</h4>
        </div>
        <p className="sub" style={{ marginTop: 0 }}>
          Les pages supprimées sont conservées ici. Restaurez-les, ou supprimez-les
          définitivement.
        </p>

        {trashQ.isLoading && <p className="muted">Chargement…</p>}
        {!trashQ.isLoading && items.length === 0 && (
          <p className="muted">La corbeille est vide. 🎉</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {items.map((p) => (
            <div key={p.id} className="row-card">
              <Icon name="file" size={15} style={{ color: "var(--ink-3)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.title}
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>{p.slug}</div>
              </div>
              {confirmPurge === p.id ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setConfirmPurge(null)}>
                    Annuler
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={purgeM.isPending}
                    onClick={() => purgeM.mutate(p.id)}
                  >
                    Supprimer définitivement
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-ghost"
                    disabled={restoreM.isPending}
                    onClick={() => restoreM.mutate(p.id)}
                  >
                    <Icon name="refresh" size={13} /> Restaurer
                  </button>
                  <button className="btn btn-danger" onClick={() => setConfirmPurge(p.id)}>
                    <Icon name="x" size={13} /> Supprimer
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 14 }}>
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
