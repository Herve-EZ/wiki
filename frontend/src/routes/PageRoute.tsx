import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { loadPage, savePage } from "../lib/pageStore";
import { evictPage } from "../lib/db";
import { isOnline } from "../lib/network";
import { isTauri } from "../lib/platform";
import { joinSections, splitSections } from "../lib/sections";
import { useAuth } from "../auth/AuthContext";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { usePageSocket } from "../hooks/usePageSocket";
import { useTransclusions } from "../hooks/useTransclusions";
import { PageBar } from "../components/TopBar";
import { SectionBlock } from "../components/editor/SectionBlock";
import { TableOfContents } from "../components/editor/TableOfContents";
import { HistoryModal } from "../components/history/HistoryModal";
import { PageActions } from "../components/PageActions";
import { ContextRail } from "../components/ContextRail";
import { CommentsPanel } from "../components/CommentsPanel";
import { MissingPageDialog } from "../components/MissingPageDialog";
import { NewPageModal } from "../components/modals/NewPageModal";
import { Icon } from "../components/Icon";
import { buildPageIndex, parseWikiHref } from "../lib/wikilinks";
import { useWorkspaceCtx } from "./workspaceContext";
import type { Page } from "../lib/types";

interface Toast {
  id: number;
  text: string;
}

export function PageRoute() {
  const { pageId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const qc = useQueryClient();
  const { user } = useAuth();
  const online = useNetworkStatus();
  const ctx = useWorkspaceCtx();

  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(searchParams.get("comments") === "1");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [createLinkTitle, setCreateLinkTitle] = useState<string | null>(null);

  const pageIndex = useMemo(() => buildPageIndex(ctx.pages), [ctx.pages]);

  const membersQ = useQuery({
    queryKey: ["members", ctx.current?.slug],
    queryFn: () => api.listMembers(ctx.current!.slug),
    enabled: online && !!ctx.current?.slug,
  });
  const members = membersQ.data ?? [];

  const pushToast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(performance.now());
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  // Click delegation for `[[wiki links]]`: open the target page, or offer to
  // create it when it doesn't exist yet.
  const onContentClick = useCallback(
    (e: React.MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href^='wiki:']");
      if (!anchor) return;
      e.preventDefault();
      const target = parseWikiHref(anchor.getAttribute("href") ?? "");
      if (!target) return;
      if (target.kind === "page") {
        navigate(`/w/${ctx.current?.slug}/${target.id}`);
      } else if (ctx.canWrite) {
        setCreateLinkTitle(target.title);
      } else {
        pushToast(`« ${target.title} » n'existe pas encore.`);
      }
    },
    [navigate, ctx.current?.slug, ctx.canWrite, pushToast],
  );

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

  const commentsQ = useQuery({
    queryKey: ["comments", pageId],
    queryFn: () => api.listComments(pageId),
    enabled: online && !!pageId,
  });
  const openCommentCount = (commentsQ.data ?? []).filter(
    (c) => !c.parent && !c.resolved,
  ).length;

  // Open the comments panel when arriving from a comment notification.
  useEffect(() => {
    if (searchParams.get("comments") === "1") setCommentsOpen(true);
  }, [searchParams]);

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
      savePage(
        next,
        { title: next.title, content_md: next.content_md, status: next.status },
        isOnline(),
      ),
    onSuccess: (res) => {
      qc.setQueryData(["page", pageId], res.page);
      if (res.queued) pushToast("Enregistré en local — synchronisation au retour du réseau");
      void qc.invalidateQueries({ queryKey: ["versions", pageId] });
      // A rename has to reach the page tree and the breadcrumb too, both of
      // which read the workspace page list.
      void qc.invalidateQueries({ queryKey: ["pages", ctx.current?.slug] });
    },
    onError: (err) =>
      pushToast(
        err instanceof ApiError && err.status === 403
          ? "Action non autorisée par votre rôle."
          : "Échec de l'enregistrement",
      ),
  });

  const moveM = useMutation({
    mutationFn: (parentId: string | null) => api.updatePage(pageId, { parent: parentId }),
    onSuccess: (res) => {
      qc.setQueryData(["page", pageId], res);
      void qc.invalidateQueries({ queryKey: ["pages", ctx.current?.slug] });
    },
    onError: (err) =>
      pushToast(
        err instanceof ApiError && err.status === 403
          ? "Action non autorisée par votre rôle."
          : "Déplacement impossible.",
      ),
  });

  const deleteM = useMutation({
    mutationFn: () => api.deletePage(pageId),
    onSuccess: async () => {
      if (isTauri()) await evictPage(pageId);
      void qc.invalidateQueries({ queryKey: ["pages", ctx.current?.slug] });
      navigate(ctx.current ? `/w/${ctx.current.slug}` : "/");
    },
    onError: (err) =>
      pushToast(
        err instanceof ApiError && err.status === 403
          ? "Seul le propriétaire peut supprimer cette page."
          : "Suppression impossible.",
      ),
  });

  const sections = useMemo(() => splitSections(content), [content]);
  // `![[Page#section]]` includes are resolved once for the whole page, then read
  // by each section's renderer.
  const transclusions = useTransclusions(content, pageIndex, pageId);
  const myId = user?.id ?? "";
  const canEdit = ctx.canWrite && !!page; // server enforces; UI gates by role

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

  // Scroll to first search hit and clear the ?q= param after a short delay.
  useEffect(() => {
    if (!searchQuery || !page) return;
    const timer = setTimeout(() => {
      const hit = document.querySelector("mark.search-hit");
      if (hit) hit.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    const cleanup = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("q");
        return next;
      }, { replace: true });
    }, 4000);
    return () => { clearTimeout(timer); clearTimeout(cleanup); };
  }, [searchQuery, setSearchParams, page]);

  if (pageQ.isLoading) {
    return (
      <div className="center-fill">
        <div className="spinner" />
      </div>
    );
  }
  if (pageQ.isError || !page) {
    const err = pageQ.error;
    if (online && err instanceof ApiError && err.status === 404) {
      return (
        <MissingPageDialog
          pageId={pageId}
          workspaceId={ctx.current?.id}
          workspaceSlug={ctx.current?.slug}
        />
      );
    }
    return (
      <div className="center-fill" style={{ flexDirection: "column", gap: 10 }}>
        <Icon name="wifiOff" size="lg" />
        {online ? "Page introuvable." : "Page indisponible hors-ligne (jamais ouverte sur cet appareil)."}
      </div>
    );
  }

  const lockCount = Object.keys(sock.locks).length;

  return (
    <>
      <PageBar
        host={ctx.barSlot}
        saving={saveM.isPending}
        online={online}
        present={sock.present}
        lockCount={lockCount}
        commentCount={openCommentCount}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenComments={() => setCommentsOpen(true)}
      />

      <div className="content">
        <div className="toast-wrap">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <Icon name="link" size="sm" style={{ color: "var(--accent)" }} />
              <span>{t.text}</span>
            </div>
          ))}
        </div>

        <div className="doc-layout">
          <div className="ed" onClick={onContentClick}>
            <div className="ed-titlerow">
              <input
                className="ed-title"
                defaultValue={page.title}
                key={page.id + page.title}
                aria-label="Titre de la page"
                onBlur={(e) => saveTitle(e.target.value.trim())}
              />
              <PageActions
                page={page}
                canWrite={ctx.canWrite}
                isOwner={ctx.isOwner}
                online={online}
                pages={ctx.pages}
                transclusions={transclusions}
                onChangeStatus={(status) => saveM.mutate({ ...page, status })}
                onMove={(parentId) => moveM.mutate(parentId)}
                onDelete={() => deleteM.mutate()}
                pushToast={pushToast}
              />
            </div>

            {/* Narrow windows only — wide ones read it from the context rail. */}
            <TableOfContents sections={sections} />

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
                  pages={ctx.pages}
                  pageIndex={pageIndex}
                  currentPageId={pageId}
                  workspaceSlug={ctx.current?.slug}
                  searchQuery={searchQuery}
                  members={members}
                  transclusions={transclusions}
                  onStartEdit={() => startEdit(s.id, s.text)}
                  onChangeDraft={setDraft}
                  onSaveEdit={() => saveEdit(s.id)}
                  onCancelEdit={() => cancelEdit(s.id)}
                />
              );
            })}
          </div>

          <ContextRail
            page={page}
            sections={sections}
            backlinks={backlinksQ.data ?? []}
            onOpenPage={(id) => navigate(`/w/${ctx.current?.slug}/${id}`)}
          />
        </div>
      </div>

      {historyOpen && (
        <HistoryModal pageId={pageId} canRestore={online} onClose={() => setHistoryOpen(false)} />
      )}

      {commentsOpen && (
        <CommentsPanel
          pageId={pageId}
          sections={sections}
          userId={myId}
          canWrite={ctx.canWrite}
          isOwner={ctx.isOwner}
          onClose={() => setCommentsOpen(false)}
        />
      )}

      {createLinkTitle !== null && ctx.current && (
        <NewPageModal
          workspaceId={ctx.current.id}
          workspaceSlug={ctx.current.slug}
          initialTitle={createLinkTitle}
          onClose={() => setCreateLinkTitle(null)}
          onCreated={(newId) => {
            setCreateLinkTitle(null);
            navigate(`/w/${ctx.current?.slug}/${newId}`);
          }}
        />
      )}
    </>
  );
}
