import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";
import { slugify } from "../../lib/slug";
import { Icon } from "../Icon";

interface Props {
  workspaceId: string;
  workspaceSlug: string;
  initialTitle?: string;
  onClose: () => void;
  onCreated: (pageId: string) => void;
}

export function NewPageModal({ workspaceId, workspaceSlug, initialTitle, onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [slug, setSlug] = useState(initialTitle ? slugify(initialTitle) : "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [imported, setImported] = useState<{ name: string; content: string } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const m = useMutation({
    mutationFn: () =>
      api.createPage({
        workspace: workspaceId,
        title: title.trim(),
        slug: (slug || slugify(title)).trim(),
        // Imported file content wins; otherwise start from a titled stub.
        content_md: imported ? imported.content : `# ${title.trim()}\n\n`,
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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setError("");
    try {
      const content = await file.text();
      const heading = content.match(/^\s*#\s+(.+?)\s*$/m);
      const derived = (heading?.[1] ?? file.name.replace(/\.(md|markdown|txt)$/i, "")).trim();
      setImported({ name: file.name, content });
      if (!title.trim() && derived) {
        setTitle(derived);
        if (!slugEdited) setSlug(slugify(derived));
      }
    } catch {
      setError("Impossible de lire le fichier.");
    }
  }

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
        <p className="sub">Créez une page dans « {workspaceSlug} », vierge ou depuis un fichier Markdown.</p>
        {error && <p className="form-error">{error}</p>}

        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown"
          style={{ display: "none" }}
          onChange={(e) => void onFile(e)}
        />
        {imported ? (
          <div className="import-chip">
            <Icon name="file" size={14} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {imported.name} · {imported.content.length.toLocaleString("fr-FR")} caractères
            </span>
            <button type="button" className="icon-btn" title="Retirer" onClick={() => setImported(null)}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginBottom: 12 }}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="upload" size={14} /> Importer un fichier Markdown
          </button>
        )}

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
            {m.isPending ? "Création…" : imported ? "Importer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
