import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";
import type { Workspace, WorkspacePermission } from "../../lib/types";
import { Icon } from "../Icon";
import { MembersPanel } from "./MembersPanel";
import { WorkflowsPanel } from "./WorkflowsPanel";

type Tab = "general" | "members" | "workflows";

interface Props {
  workspace: Workspace;
  onClose: () => void;
  onDeleted: () => void;
}

export function WorkspaceSettingsModal({ workspace, onClose, onDeleted }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("general");
  const [name, setName] = useState(workspace.name);
  const [permission, setPermission] = useState<WorkspacePermission>(workspace.permission);
  const [requireMfa, setRequireMfa] = useState(workspace.require_mfa);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const saveM = useMutation({
    mutationFn: () =>
      api.updateWorkspace(workspace.slug, {
        name: name.trim(),
        permission,
        require_mfa: requireMfa,
      }),
    onSuccess: () => {
      setNotice("Réglages enregistrés.");
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.detail : "Échec de l'enregistrement."),
  });

  const deleteM = useMutation({
    mutationFn: () => api.deleteWorkspace(workspace.slug),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
      onDeleted();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.detail : "Impossible de supprimer l'espace."),
  });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <Icon name="settings" size={16} style={{ marginRight: 8 }} />
          Réglages · {workspace.name}
          <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="tab-row">
          <button className={`tab${tab === "general" ? " active" : ""}`} onClick={() => setTab("general")}>
            Général
          </button>
          <button className={`tab${tab === "members" ? " active" : ""}`} onClick={() => setTab("members")}>
            Membres
          </button>
          <button className={`tab${tab === "workflows" ? " active" : ""}`} onClick={() => setTab("workflows")}>
            Workflows
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}

          {tab === "general" && (
            <>
              <div className="field">
                <label htmlFor="ws-name">Nom</label>
                <input id="ws-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ws-perm">Visibilité</label>
                <select
                  id="ws-perm"
                  className="input"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as WorkspacePermission)}
                >
                  <option value="private">Privé (membres invités)</option>
                  <option value="invite">Sur invitation</option>
                  <option value="public">Public (lecture ouverte)</option>
                </select>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={requireMfa} onChange={(e) => setRequireMfa(e.target.checked)} />
                Exiger la double authentification (2FA) pour accéder
              </label>
              <div style={{ display: "flex", marginTop: 14 }}>
                <button className="btn btn-primary" disabled={saveM.isPending} onClick={() => { setError(""); setNotice(""); saveM.mutate(); }}>
                  {saveM.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>

              <div className="danger-zone">
                <div className="row-title" style={{ color: "var(--danger)" }}>Zone dangereuse</div>
                <p className="muted" style={{ fontSize: 12 }}>
                  La suppression d'un espace efface toutes ses pages. Action irréversible.
                </p>
                {!confirmDelete ? (
                  <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                    Supprimer cet espace
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Annuler</button>
                    <button className="btn btn-danger" disabled={deleteM.isPending} onClick={() => { setError(""); deleteM.mutate(); }}>
                      {deleteM.isPending ? "Suppression…" : "Confirmer la suppression"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "members" && <MembersPanel workspaceSlug={workspace.slug} />}
          {tab === "workflows" && (
            <WorkflowsPanel workspaceId={workspace.id} workspaceSlug={workspace.slug} />
          )}
        </div>
      </div>
    </div>
  );
}
