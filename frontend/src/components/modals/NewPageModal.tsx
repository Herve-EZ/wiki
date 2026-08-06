import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { slugify } from "../../lib/slug";
import {
  BUILTIN_TEMPLATES,
  applyTemplateVars,
  toChoice,
  type TemplateChoice,
} from "../../lib/templates";
import { Icon } from "../Icon";

interface Props {
  workspaceId: string;
  workspaceSlug: string;
  initialTitle?: string;
  /** When set, the new page is created as a child of this page. */
  parentId?: string | null;
  parentTitle?: string;
  onClose: () => void;
  onCreated: (pageId: string) => void;
}

export function NewPageModal({
  workspaceId,
  workspaceSlug,
  initialTitle,
  parentId,
  parentTitle,
  onClose,
  onCreated,
}: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const online = useNetworkStatus();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [slug, setSlug] = useState(initialTitle ? slugify(initialTitle) : "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [imported, setImported] = useState<{ name: string; content: string } | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Workspace templates sit alongside the built-ins; offline they simply don't
  // show up (the built-ins always do).
  const templatesQ = useQuery({
    queryKey: ["templates", workspaceSlug],
    queryFn: () => api.listTemplates(workspaceSlug),
    enabled: online,
  });

  const choices: TemplateChoice[] = useMemo(
    () => [...BUILTIN_TEMPLATES, ...(templatesQ.data ?? []).map(toChoice)],
    [templatesQ.data],
  );
  const template = choices.find((c) => c.id === templateId);

  /** Body of the new page: imported file, then template, then a titled stub. */
  function initialContent(): string {
    const cleanTitle = title.trim();
    if (imported) return imported.content;
    if (template) {
      return applyTemplateVars(template.content_md, {
        titre: cleanTitle,
        auteur: user?.display_name || user?.email || "",
      });
    }
    return `# ${cleanTitle}\n\n`;
  }

  const m = useMutation({
    mutationFn: () =>
      api.createPage({
        workspace: workspaceId,
        parent: parentId ?? null,
        title: title.trim(),
        slug: (slug || slugify(title)).trim(),
        content_md: initialContent(),
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
      setTemplateId(""); // an imported file supersedes a template
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

  const submitLabel = imported ? "Importer" : template ? "Créer depuis le modèle" : "Créer";

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h4>{parentId ? "Nouvelle sous-page" : "Nouvelle page"}</h4>
        <p className="sub">
          {parentId && parentTitle
            ? `Sous « ${parentTitle} », vierge, depuis un modèle ou depuis un fichier.`
            : `Créez une page dans « ${workspaceSlug} », vierge, depuis un modèle ou depuis un fichier.`}
        </p>
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
            <span className="menu-item-label">
              {imported.name} · {imported.content.length.toLocaleString("fr-FR")} caractères
            </span>
            <button type="button" className="icon-btn" title="Retirer" onClick={() => setImported(null)}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="field">
              <label htmlFor="np-template">Partir d'un modèle</label>
              <select
                id="np-template"
                className="input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Page vierge</option>
                <optgroup label="Modèles intégrés">
                  {BUILTIN_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
                {(templatesQ.data ?? []).length > 0 && (
                  <optgroup label="Modèles de l'espace">
                    {(templatesQ.data ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            {template && (
              <p className="template-hint">
                <Icon name={template.icon} size={13} />
                <span>{template.description || "Modèle de l'espace."}</span>
              </p>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ marginBottom: 12 }}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="upload" size={14} /> Importer un fichier Markdown
            </button>
          </>
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
            {m.isPending ? "Création…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
