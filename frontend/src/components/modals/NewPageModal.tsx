import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";
import { slugify } from "../../lib/slug";
import { Icon } from "../Icon";

interface Props {
  workspaceId: string;
  workspaceSlug: string;
  onClose: () => void;
  onCreated: (pageId: string) => void;
}

export function NewPageModal({ workspaceId, workspaceSlug, onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");

  const m = useMutation({
    mutationFn: () =>
      api.createPage({
        workspace: workspaceId,
        title: title.trim(),
        slug: (slug || slugify(title)).trim(),
        content_md: `# ${title.trim()}\n\n`,
      }),
    onSuccess: (page) => {
      void qc.invalidateQueries({ queryKey: ["pages", workspaceSlug] });
      onCreated(page.id);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError && err.status === 400
          ? "Un slug identique existe déjà dans cet espace."
          : "Impossible de créer la page.",
      );
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return;
    m.mutate();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h4>Nouvelle page</h4>
        <p className="sub">Créez une page dans « {workspaceSlug} ».</p>
        {error && <p className="form-error">{error}</p>}
        <div className="field">
          <label htmlFor="np-title">Titre</label>
          <input
            id="np-title"
            className="input"
            value={title}
            autoFocus
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="np-slug">Slug</label>
          <input
            id="np-slug"
            className="input"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
            disabled={m.isPending || !title.trim()}
          >
            <Icon name="plus" size={13} />
            {m.isPending ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
