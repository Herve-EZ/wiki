import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { evictPage, getCachedPage } from "../lib/db";
import { isTauri } from "../lib/platform";
import { slugify } from "../lib/slug";
import type { CachedPage } from "../lib/types";
import { Icon } from "./Icon";

interface Props {
  pageId: string;
  workspaceId: string | undefined;
  workspaceSlug: string | undefined;
}

/** Shown when a page returns 404 on open: it was deleted on the server. Offer to
 * forget it locally, or recreate it from the local copy (desktop only). */
export function MissingPageDialog({ pageId, workspaceId, workspaceSlug }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cached, setCached] = useState<CachedPage | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isTauri()) getCachedPage(pageId).then(setCached).catch(() => setCached(null));
  }, [pageId]);

  function goBack() {
    void qc.invalidateQueries({ queryKey: ["pages"] });
    navigate(workspaceSlug ? `/w/${workspaceSlug}` : "/", { replace: true });
  }

  async function forget() {
    setBusy(true);
    try {
      if (isTauri()) await evictPage(pageId);
      goBack();
    } finally {
      setBusy(false);
    }
  }

  async function recreate() {
    if (!workspaceId || !cached) return;
    setBusy(true);
    try {
      const page = await api.createPage({
        workspace: workspaceId,
        title: cached.title,
        slug: slugify(cached.title),
        content_md: cached.content_md,
      });
      if (isTauri()) await evictPage(pageId);
      void qc.invalidateQueries({ queryKey: ["pages"] });
      navigate(`/w/${workspaceSlug}/${page.id}`, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  const canRecreate = !!workspaceId && !!cached;

  return (
    <div className="overlay">
      <div className="card" style={{ maxWidth: 440 }}>
        <h4>Page introuvable</h4>
        <p className="sub">
          Cette page n'existe plus sur le serveur (elle a probablement été
          supprimée). Que souhaitez-vous faire&nbsp;?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn btn-primary btn-block" disabled={busy || !canRecreate} onClick={() => void recreate()}>
            <Icon name="plus" size={13} />
            Recréer la page {canRecreate ? "" : "(copie locale indisponible)"}
          </button>
          <button className="btn btn-danger btn-block" disabled={busy} onClick={() => void forget()}>
            Supprimer / oublier cette page
          </button>
        </div>
      </div>
    </div>
  );
}
