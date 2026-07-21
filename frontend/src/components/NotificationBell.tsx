import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { notify as osNotify } from "../lib/native";
import { pushGlobalToast } from "./ToastContainer";
import { Icon } from "./Icon";
import type { AppNotification } from "../lib/types";

const TYPE_ICONS: Record<string, string> = {
  invitation: "mail",
  mention: "at",
  page_updated: "file",
  workflow_stage: "clock",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days} j`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // `null` = not yet initialised; distinguishes "first load" from "count fell".
  const prevCountRef = useRef<number | null>(null);
  // IDs already surfaced, so a notification is never toasted twice.
  const seenRef = useRef<Set<string>>(new Set());
  const countQ = useQuery({
    queryKey: ["notif-count"],
    queryFn: api.unreadCount,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const count = countQ.data?.count ?? 0;

  // When the unread count rises, surface the freshly-arrived notifications:
  // an in-app toast (visible even while the window is focused — the OS banner
  // is suppressed in that case) plus a native banner when the app is in the
  // background. On the very first load we only seed `seenRef` so pre-existing
  // notifications don't replay as toasts.
  useEffect(() => {
    if (countQ.data === undefined) return; // wait for the first real value
    const prev = prevCountRef.current;
    prevCountRef.current = count;
    if (prev !== null && count <= prev) return;

    void (async () => {
      let unread: AppNotification[];
      try {
        unread = await api.listNotifications(true);
      } catch {
        return;
      }
      if (prev === null) {
        unread.forEach((n) => seenRef.current.add(n.id));
        return;
      }
      const fresh = unread.filter((n) => !seenRef.current.has(n.id));
      fresh.forEach((n) => seenRef.current.add(n.id));
      fresh
        .slice(0, 3)
        .forEach((n) => pushGlobalToast(n.title, TYPE_ICONS[n.type] ?? "bell"));
      if (fresh.length > 0 && !document.hasFocus()) {
        const top = fresh[0];
        void osNotify(top.title, top.body || "Nouvelle notification");
      }
      // Keep the dropdown list in sync if it happens to be open.
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    })();
  }, [countQ.data, count, qc]);

  const listQ = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.listNotifications(),
    enabled: open,
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notif-count"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllM = useMutation({
    mutationFn: () => api.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notif-count"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleClick(n: AppNotification) {
    // Opening a notification consumes it: remove it server-side and locally.
    seenRef.current.add(n.id);
    deleteM.mutate(n.id);
    const p = n.payload;
    if (p.workspace_slug && p.page_id) {
      navigate(`/w/${p.workspace_slug}/${p.page_id}`);
      setOpen(false);
    } else if (p.invitation_token) {
      navigate(`/invite/${p.invitation_token}`);
      setOpen(false);
    }
  }

  return (
    <div className="notif-bell-wrap" ref={panelRef}>
      <button
        className="icon-btn notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label="Notifications"
      >
        <Icon name="bell" size={16} />
        {count > 0 && <span className="notif-badge">{count > 99 ? "99+" : count}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <span className="notif-panel-title">Notifications</span>
            {count > 0 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11.5, padding: "2px 6px" }}
                onClick={() => markAllM.mutate()}
              >
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="notif-panel-body">
            {listQ.isLoading && (
              <div className="notif-empty">Chargement…</div>
            )}
            {listQ.data && listQ.data.length === 0 && (
              <div className="notif-empty">Aucune notification</div>
            )}
            {(listQ.data ?? []).map((n) => (
              <button
                key={n.id}
                className={`notif-item${n.read_at ? "" : " unread"}`}
                onClick={() => handleClick(n)}
              >
                <Icon name={TYPE_ICONS[n.type] ?? "bell"} size={14} />
                <div className="notif-item-body">
                  <span className="notif-item-title">{n.title}</span>
                  {n.body && <span className="notif-item-text">{n.body}</span>}
                  <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
