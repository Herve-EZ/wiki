import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";
import type { WorkflowStage } from "../../lib/types";
import { Icon } from "../Icon";

interface Props {
  workspaceId: string;
  workspaceSlug: string;
}

interface DraftStage {
  name: string;
  is_final: boolean;
}

export function WorkflowsPanel({ workspaceId, workspaceSlug }: Props) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<DraftStage[]>([
    { name: "Brouillon", is_final: false },
    { name: "Revue", is_final: false },
    { name: "Publié", is_final: true },
  ]);
  const [error, setError] = useState("");

  const workflowsQ = useQuery({
    queryKey: ["workflows", workspaceSlug],
    queryFn: () => api.listWorkflows(workspaceSlug),
  });
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ["workflows", workspaceSlug] });

  const createM = useMutation({
    mutationFn: () =>
      api.createWorkflow({
        workspace: workspaceId,
        name: name.trim(),
        description: description.trim(),
        stages: stages
          .filter((s) => s.name.trim())
          .map((s, i): WorkflowStage => ({
            name: s.name.trim(),
            order: i,
            is_final: s.is_final,
          })),
      }),
    onSuccess: () => {
      setCreating(false);
      setName("");
      setDescription("");
      invalidate();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.detail : "Impossible de créer le workflow."),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => api.deleteWorkflow(id),
    onSuccess: invalidate,
  });

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      {(workflowsQ.data ?? []).map((w) => (
        <div key={w.id} className="row-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row-title">{w.name}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {w.stages.map((s) => s.name).join(" → ") || "aucune étape"}
            </div>
          </div>
          <button className="icon-btn" title="Supprimer" onClick={() => deleteM.mutate(w.id)}>
            <Icon name="x" size={15} />
          </button>
        </div>
      ))}
      {(workflowsQ.data ?? []).length === 0 && (
        <p className="muted">Aucun workflow défini.</p>
      )}

      {!creating ? (
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>
          <Icon name="plus" size={13} /> Nouveau workflow
        </button>
      ) : (
        <div className="row-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="wf-name">Nom du workflow</label>
            <input id="wf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Étapes (dans l'ordre)</label>
            {stages.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input
                  className="input"
                  value={s.name}
                  onChange={(e) =>
                    setStages((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <label className="check-row" style={{ margin: 0, whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={s.is_final}
                    onChange={(e) =>
                      setStages((prev) => prev.map((x, j) => (j === i ? { ...x, is_final: e.target.checked } : x)))
                    }
                  />
                  finale
                </label>
                <button
                  className="icon-btn"
                  title="Retirer"
                  onClick={() => setStages((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
            <button
              className="link"
              onClick={() => setStages((prev) => [...prev, { name: "", is_final: false }])}
            >
              + Ajouter une étape
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>Annuler</button>
            <button
              className="btn btn-primary"
              style={{ marginLeft: "auto" }}
              disabled={createM.isPending || !name.trim()}
              onClick={() => {
                setError("");
                createM.mutate();
              }}
            >
              {createM.isPending ? "Création…" : "Créer le workflow"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
