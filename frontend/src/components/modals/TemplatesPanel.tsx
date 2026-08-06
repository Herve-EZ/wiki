import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";
import { BUILTIN_TEMPLATES } from "../../lib/templates";
import type { PageTemplate } from "../../lib/types";
import { Icon } from "../Icon";

interface Props {
  workspaceSlug: string;
}

interface Draft {
  /** Empty for a template being created. */
  id: string;
  name: string;
  description: string;
  content_md: string;
}

const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  description: "",
  content_md: "# {{titre}}\n\n",
};

/** Owner-only management of the workspace's page templates. The four built-in
 * templates are listed read-only, so the owner sees the full menu authors get. */
export function TemplatesPanel({ workspaceSlug }: Props) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  const templatesQ = useQuery({
    queryKey: ["templates", workspaceSlug],
    queryFn: () => api.listTemplates(workspaceSlug),
  });
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ["templates", workspaceSlug] });

  const saveM = useMutation({
    mutationFn: (d: Draft) =>
      d.id
        ? api.updateTemplate(d.id, {
            name: d.name.trim(),
            description: d.description.trim(),
            content_md: d.content_md,
          })
        : api.createTemplate(workspaceSlug, {
            name: d.name.trim(),
            description: d.description.trim(),
            content_md: d.content_md,
          }),
    onSuccess: () => {
      setDraft(null);
      invalidate();
    },
    onError: (err) =>
      setError(
        err instanceof ApiError && err.status === 400
          ? "Ce nom de modèle est déjà utilisé dans cet espace."
          : "Impossible d'enregistrer le modèle.",
      ),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: invalidate,
    onError: () => setError("Impossible de supprimer le modèle."),
  });

  function edit(tpl: PageTemplate) {
    setError("");
    setDraft({
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      content_md: tpl.content_md,
    });
  }

  if (draft) {
    return (
      <div>
        {error && <p className="form-error">{error}</p>}
        <div className="field">
          <label htmlFor="tpl-name">Nom du modèle</label>
          <input
            id="tpl-name"
            className="input"
            value={draft.name}
            autoFocus
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="tpl-desc">Description</label>
          <input
            id="tpl-desc"
            className="input"
            placeholder="À quoi sert ce modèle ?"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="tpl-body">Contenu Markdown</label>
          <textarea
            id="tpl-body"
            className="input tpl-textarea"
            value={draft.content_md}
            onChange={(e) => setDraft({ ...draft, content_md: e.target.value })}
          />
          <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
            Variables remplacées à la création de la page :{" "}
            <code>{"{{titre}}"}</code>, <code>{"{{date}}"}</code>,{" "}
            <code>{"{{auteur}}"}</code>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setDraft(null)}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
            disabled={saveM.isPending || !draft.name.trim()}
            onClick={() => {
              setError("");
              saveM.mutate(draft);
            }}
          >
            <Icon name="save" size={13} />
            {saveM.isPending ? "Enregistrement…" : draft.id ? "Enregistrer" : "Créer le modèle"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="form-error">{error}</p>}

      <div className="row-title" style={{ marginBottom: 8 }}>
        Modèles de l'espace
      </div>
      {(templatesQ.data ?? []).map((t) => (
        <div key={t.id} className="row-card">
          <Icon name="template" size={15} style={{ color: "var(--accent)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row-title">{t.name}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {t.description || "Sans description"}
            </div>
          </div>
          <button className="icon-btn" title="Modifier" onClick={() => edit(t)}>
            <Icon name="pencil" size={15} />
          </button>
          <button
            className="icon-btn"
            title="Supprimer"
            disabled={deleteM.isPending}
            onClick={() => {
              setError("");
              deleteM.mutate(t.id);
            }}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      ))}
      {(templatesQ.data ?? []).length === 0 && (
        <p className="muted">
          Aucun modèle propre à cet espace. Les modèles intégrés ci-dessous restent
          disponibles.
        </p>
      )}
      <button
        className="btn btn-ghost"
        style={{ marginTop: 10 }}
        onClick={() => {
          setError("");
          setDraft(EMPTY_DRAFT);
        }}
      >
        <Icon name="plus" size={13} /> Nouveau modèle
      </button>

      <div className="row-title" style={{ marginTop: 20, marginBottom: 8 }}>
        Modèles intégrés
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Toujours proposés à la création d'une page, dans tous les espaces.
      </p>
      {BUILTIN_TEMPLATES.map((t) => (
        <div key={t.id} className="row-card">
          <Icon name={t.icon} size={15} style={{ color: "var(--ink-3)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row-title">{t.name}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {t.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
