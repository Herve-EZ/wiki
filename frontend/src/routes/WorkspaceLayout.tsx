import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useSync } from "../hooks/useSync";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { SearchPalette } from "../components/SearchPalette";
import { OfflineBanner } from "../components/OfflineBanner";
import { ConflictsModal } from "../components/ConflictsModal";
import { ToastContainer } from "../components/ToastContainer";
import { NewPageModal } from "../components/modals/NewPageModal";
import type { Role } from "../lib/types";
import type { WorkspaceCtx } from "./workspaceContext";

const NAV_KEY = "wikicollab.sidebar.open";

export function WorkspaceLayout() {
  const { workspace: slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { online, pending, conflicts, syncing, sync, refresh: refreshSync } = useSync();

  const [updatedPageIds, setUpdatedPageIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [menuNewPage, setMenuNewPage] = useState(false);
  // Ref callback rather than an id lookup: the slot is a real React value, so
  // routes portal into it as soon as it exists.
  const [barSlot, setBarSlot] = useState<HTMLDivElement | null>(null);

  // Navigation: an icon rail when collapsed on a wide screen, an off-canvas
  // drawer below 1024px. One boolean, two presentations.
  const narrow = useMediaQuery("(max-width: 1023px)");
  const [navOpen, setNavOpen] = useState(() => localStorage.getItem(NAV_KEY) !== "0");
  const toggleNav = useCallback(() => {
    setNavOpen((open) => {
      // Only the desktop preference is worth remembering; the drawer always
      // starts closed on a small screen.
      if (!window.matchMedia("(max-width: 1023px)").matches) {
        localStorage.setItem(NAV_KEY, open ? "0" : "1");
      }
      return !open;
    });
  }, []);

  // The drawer covers the content, so it must not survive a navigation.
  useEffect(() => {
    if (narrow) setNavOpen(false);
  }, [narrow, location.pathname]);

  // Ctrl/Cmd + \ — the shortcut every editor uses for this.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        toggleNav();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleNav]);

  // Auto-sync + reload when the connection comes back after being offline.
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current) void sync();
    wasOnline.current = online;
  }, [online, sync]);

  const currentPageId = location.pathname.split("/")[3];

  const workspacesQ = useQuery({ queryKey: ["workspaces"], queryFn: api.listWorkspaces });
  const pagesQ = useQuery({
    queryKey: ["pages", slug],
    queryFn: () => api.listWorkspacePages(slug),
    enabled: !!slug,
  });

  const current = useMemo(
    () => (workspacesQ.data ?? []).find((w) => w.slug === slug),
    [workspacesQ.data, slug],
  );

  const role: Role | null = current?.my_role ?? null;
  const canWrite = role === "owner" || role === "editor";
  const isOwner = role === "owner";

  const markUpdated = useCallback((id: string) => {
    setUpdatedPageIds((prev) => new Set(prev).add(id));
  }, []);

  // Clear the "updated" badge once the user opens that page.
  useEffect(() => {
    if (!currentPageId) return;
    setUpdatedPageIds((prev) => {
      if (!prev.has(currentPageId)) return prev;
      const next = new Set(prev);
      next.delete(currentPageId);
      return next;
    });
  }, [currentPageId]);

  // Global Ctrl/Cmd+K opens search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Native menu (desktop): Fichier → Rechercher / Nouvelle page.
  useEffect(() => {
    const onSearch = () => setSearchOpen(true);
    const onNewPage = () => setMenuNewPage(true);
    window.addEventListener("menu:search", onSearch);
    window.addEventListener("menu:new-page", onNewPage);
    return () => {
      window.removeEventListener("menu:search", onSearch);
      window.removeEventListener("menu:new-page", onNewPage);
    };
  }, []);

  const ctx: WorkspaceCtx = {
    workspaces: workspacesQ.data ?? [],
    current,
    role,
    canWrite,
    isOwner,
    pages: pagesQ.data ?? [],
    updatedPageIds,
    markUpdated,
    openSearch: () => setSearchOpen(true),
    refetchPages: () => void pagesQ.refetch(),
    barSlot,
  };

  const currentPage = (pagesQ.data ?? []).find((p) => p.id === currentPageId);

  return (
    <div className="app">
      <ToastContainer />
      <OfflineBanner
        online={online}
        pending={pending}
        conflicts={conflicts}
        onRetry={() => void sync()}
        onResolve={() => setConflictsOpen(true)}
      />
      <div className="app-main">
        <Sidebar
          workspaces={workspacesQ.data ?? []}
          current={current}
          role={role}
          canWrite={canWrite}
          isOwner={isOwner}
          pages={pagesQ.data ?? []}
          currentPageId={currentPageId}
          updatedPageIds={updatedPageIds}
          user={user}
          online={online}
          pending={pending}
          conflicts={conflicts}
          syncing={syncing}
          navOpen={navOpen}
          narrow={narrow}
          onToggleNav={toggleNav}
          onSync={() => void sync()}
          onLogout={() => void logout()}
        />
        {narrow && navOpen && (
          <button
            className="nav-scrim"
            aria-label="Fermer la navigation"
            onClick={toggleNav}
          />
        )}
        <div className="app-col">
          <TopBar
            workspaceName={current?.name ?? "WikiCollab"}
            workspaceSlug={current?.slug}
            pageTitle={currentPage?.title}
            onOpenSearch={() => setSearchOpen(true)}
            onToggleNav={toggleNav}
            slotRef={setBarSlot}
          />
          <Outlet context={ctx} />
        </div>
      </div>

      {searchOpen && current && (
        <SearchPalette
          workspace={current.slug}
          onPick={(id, query) => {
            setSearchOpen(false);
            navigate(
              query
                ? `/w/${current.slug}/${id}?q=${encodeURIComponent(query)}`
                : `/w/${current.slug}/${id}`,
            );
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {conflictsOpen && (
        <ConflictsModal
          onClose={() => setConflictsOpen(false)}
          onChanged={refreshSync}
        />
      )}

      {menuNewPage && current && canWrite && (
        <NewPageModal
          workspaceId={current.id}
          workspaceSlug={current.slug}
          onClose={() => setMenuNewPage(false)}
          onCreated={(id) => {
            setMenuNewPage(false);
            void pagesQ.refetch();
            navigate(`/w/${current.slug}/${id}`);
          }}
        />
      )}
    </div>
  );
}
