import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useSync } from "../hooks/useSync";
import { Sidebar } from "../components/Sidebar";
import { SearchPalette } from "../components/SearchPalette";
import { OfflineBanner } from "../components/OfflineBanner";
import { ConflictsModal } from "../components/ConflictsModal";
import type { Role } from "../lib/types";
import type { WorkspaceCtx } from "./workspaceContext";

export function WorkspaceLayout() {
  const { workspace: slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { online, pending, conflicts, syncing, sync, refresh: refreshSync } = useSync();

  const [updatedPageIds, setUpdatedPageIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [conflictsOpen, setConflictsOpen] = useState(false);

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
  };

  return (
    <div className="app">
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
          onSync={() => void sync()}
          onLogout={() => void logout()}
        />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <Outlet context={ctx} />
        </div>
      </div>

      {searchOpen && current && (
        <SearchPalette
          workspace={current.slug}
          onPick={(id) => {
            setSearchOpen(false);
            navigate(`/w/${current.slug}/${id}`);
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
    </div>
  );
}
