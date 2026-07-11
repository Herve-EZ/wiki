import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";
import { slugify } from "../../lib/slug";
import type { WorkspacePermission } from "../../lib/types";

interface Props {
  onClose: () => void;
  onCreated: (slug: string) => void;
}

export function NewWorkspaceModal({ onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [permission, setPermission] = useState<WorkspacePermission>("private");
  const [requireMfa, setRequireMfa] = useState(false);
  const [error, setError] = useState("");

  const m = useMutation({
    mutationFn: () =>
      api.createWorkspace({
        name: name.trim(),
        slug: (slug || slugify(name)).trim(),
        permission,
        require_mfa: requireMfa,
      }),
    onSuccess: (ws) => {
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
      onCreated(ws.slug);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError && err.status === 400
          ? "Nom ou slug invalide (le slug doit être unique)."
          : "Impossible de créer l'espace.",
      );
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    m.mutate();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h4>Nouvel espace de travail</h4>
        <p className="sub">Vous en serez automatiquement le propriétaire.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="field">
          <label htmlFor="nw-name">Nom</label>
          <input
            id="nw-name"
            className="input"
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="nw-slug">Slug</label>
          <input
            id="nw-slug"
            className="input"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="nw-perm">Visibilité</label>
          <select
            id="nw-perm"
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
          <input
            type="checkbox"
            checked={requireMfa}
            onChange={(e) => setRequireMfa(e.target.checked)}
          />
          Exiger la double authentification (2FA) pour accéder
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
            disabled={m.isPending || !name.trim()}
          >
            {m.isPending ? "Création…" : "Créer l'espace"}
          </button>
        </div>
      </form>
    </div>
  );
}
