import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { loadPage, savePage } from "../lib/pageStore";
import { isOnline } from "../lib/network";
import { joinSections, splitSections } from "../lib/sections";
import { useAuth } from "../auth/AuthContext";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { usePageSocket } from "../hooks/usePageSocket";
import { TopBar } from "../components/TopBar";
import { PresenceBar } from "../components/PresenceBar";
import { SectionBlock } from "../components/editor/SectionBlock";
import { HistoryModal } from "../components/history/HistoryModal";
import { Icon } from "../components/Icon";
import { useWorkspaceCtx } from "./workspaceContext";
import type { Page } from "../lib/types";

interface Toast {
  id: number;
  text: string;
}

export function PageRoute() {
  const { pageId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const online = useNetworkStatus();
  const ctx = useWorkspaceCtx();

  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(performance.now());
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const pageQ = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => loadPage(pageId, isOnline()),
  });
  const page = pageQ.data;

  useEffect(() => {
    if (page) setContent(page.content_md);
  }, [page]);

  const backlinksQ = useQuery({
    queryKey: ["backlinks", pageId],
    queryFn: () => api.backlinks(pageId),
    enabled: online && !!pageId,
  });

  const sock = usePageSocket(pageId, {
    enabled: online,
    onNotifyUpdate: (p) => {
      pushToast(`« ${p.title} » — page liée mise à jour`);
      ctx.markUpdated(p.page_id);
    },
  });

  // Surface a lock-denied response as a toast.
  useEffect(() => {
    if (sock.denied) {
      pushToast(`Section verrouillée par ${sock.denied.display_name ?? "un autre utilisateur"}`);
    }
  }, [sock.denied, pushToast]);

  const saveM = useMutation({
    mutationFn: (next: Page) =>
      savePage(next, { title: next.title, content_md: next.content_md }, isOnline()),
    onSuccess: (res) => {
      qc.setQueryData(["page", pageId], res.page);
      if (res.queued) pushToast("Enregistré en local — synchronisation au retour du réseau");
      void qc.invalidateQueries({ queryKey: ["versions", pageId] });
    },
    onError: () => pushToast("Échec de l'enregistrement"),
  });

  const sections = useMemo(() => splitSections(content), [content]);
  const myId = user?.id ?? "";
  const canEdit = !!page; // permission is enforced server-side; UI stays optimistic

  function startEdit(sectionId: string, text: string) {
    if (online) sock.acquire(sectionId);
    setEditingId(sectionId);
    setDraft(text);
  }

  function cancelEdit(sectionId: string) {
    if (online) sock.release(sectionId);
    setEditingId(null);
  }

  function saveEdit(sectionId: string) {
    if (!page) return;
    const next = sections.map((s) => (s.id === sectionId ? { ...s, text: draft } : s));
    const nextContent = joinSections(next);
    setContent(nextContent);
    setEditingId(null);
    if (online) sock.release(sectionId);
    saveM.mutate({ ...page, content_md: nextContent });
  }

  function saveTitle(title: string) {
    if (!page || title === page.title) return;
    saveM.mutate({ ...page, title });
  }

  if (pageQ.isLoading) {
    return (
      <div className="center-fill">
        <div className="spinner" />
      </div>
    );
  }
  if (pageQ.isError || !page) {
    return (
      <div className="center-fill" style={{ flexDirection: "column", gap: 10 }}>
        <Icon name="wifiOff" size={22} />
        {online ? "Page introuvable." : "Page indisponible hors-ligne (jamais ouverte sur cet appareil)."}
      </div>
    );
  }

  const lockCount = Object.keys(sock.locks).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <TopBar
        workspaceName={ctx.current?.name ?? page.workspace}
        pageTitle={page.title}
        saved={!saveM.isPending}
        saving={saveM.isPending}
        present={sock.present}
        onOpenSearch={ctx.openSearch}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <div className="content">
        <div className="toast-wrap">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <Icon name="link" size={14} style={{ color: "var(--accent)" }} />
              <span>{t.text}</span>
            </div>
          ))}
        </div>

        <div className="ed">
          <span className="ed-status">
            <Icon name="check" size={11} /> {page.status === "published" ? "Publié" : page.status}
          </span>
          <input
            className="ed-title"
            defaultValue={page.title}
            key={page.id + page.title}
            onBlur={(e) => saveTitle(e.target.value.trim())}
          />

          {sections.map((s) => {
            const lock = sock.locks[s.id];
            const isMine = !!lock && lock.user_id === myId;
            return (
              <SectionBlock
                key={s.id}
                section={s}
                lock={lock}
                isMine={isMine || editingId === s.id}
                editing={editingId === s.id}
                draft={draft}
                canEdit={canEdit && editingId === null}
                onStartEdit={() => startEdit(s.id, s.text)}
                onChangeDraft={setDraft}
                onSaveEdit={() => saveEdit(s.id)}
                onCancelEdit={() => cancelEdit(s.id)}
              />
            );
          })}

          <div className="linked">
            <span className="lbl">Lié à :</span>
            {(backlinksQ.data ?? []).length === 0 && (
              <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>aucune page liée</span>
            )}
            {(backlinksQ.data ?? []).map((p) => (
              <button
                key={p.id}
                className="chip-link"
                onClick={() => navigate(`/w/${ctx.current?.slug}/${p.id}`)}
              >
                <Icon name="link" size={11} />
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <PresenceBar present={sock.present} lockCount={lockCount} online={online} />

      {historyOpen && (
        <HistoryModal pageId={pageId} canRestore={online} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}
