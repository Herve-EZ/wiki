import { useCallback, useEffect, useRef, useState } from "react";
import { connectPage } from "../lib/ws";
import type { PageSocket, WsEvent } from "../lib/ws";

export interface PresentUser {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
}

export interface SectionLock {
  section_id: string;
  user_id: string;
  display_name: string;
  expires_at: string;
}

export interface PageSocketState {
  connected: boolean;
  present: PresentUser[];
  locks: Record<string, SectionLock>;
  acquire: (sectionId: string) => void;
  release: (sectionId: string) => void;
  denied: SectionLock | null;
}

interface Options {
  enabled: boolean;
  onNotifyUpdate?: (payload: { page_id: string; title: string }) => void;
}

function dedupeByUser(list: PresentUser[]): PresentUser[] {
  const byId = new Map<string, PresentUser>();
  for (const u of list) byId.set(u.user_id, u);
  return [...byId.values()];
}

/** Presence + section-lock state for a page over the WebSocket. Online-only:
 * pass `enabled=false` (degraded mode) to keep the socket closed. */
export function usePageSocket(pageId: string, opts: Options): PageSocketState {
  const { enabled, onNotifyUpdate } = opts;
  const [connected, setConnected] = useState(false);
  const [present, setPresent] = useState<PresentUser[]>([]);
  const [locks, setLocks] = useState<Record<string, SectionLock>>({});
  const [denied, setDenied] = useState<SectionLock | null>(null);
  const sockRef = useRef<PageSocket | null>(null);
  const notifyRef = useRef(onNotifyUpdate);
  notifyRef.current = onNotifyUpdate;

  useEffect(() => {
    if (!enabled || !pageId) return;
    setPresent([]);
    setLocks({});

    const upsertLock = (l: SectionLock) =>
      setLocks((prev) => ({ ...prev, [l.section_id]: l }));

    const socket = connectPage(pageId, (e: WsEvent) => {
      switch (e.type) {
        case "presence.sync":
          setConnected(true);
          // Presence is per-person: collapse multiple connections (multi-tab,
          // reconnects) of the same user into one entry so avatars/keys stay unique.
          setPresent(dedupeByUser((e.users as PresentUser[]) ?? []));
          break;
        case "presence.join":
          setPresent((prev) => {
            const u = e as unknown as PresentUser;
            if (prev.some((p) => p.user_id === u.user_id)) return prev;
            return [...prev, u];
          });
          break;
        case "presence.leave":
          setPresent((prev) => prev.filter((p) => p.user_id !== e.user_id));
          break;
        case "lock.sync":
          setLocks(
            Object.fromEntries(
              ((e.locks as SectionLock[]) ?? []).map((l) => [l.section_id, l]),
            ),
          );
          break;
        case "lock.acquire":
          upsertLock(e as unknown as SectionLock);
          break;
        case "lock.release":
          setLocks((prev) => {
            const next = { ...prev };
            delete next[e.section_id as string];
            return next;
          });
          break;
        case "lock.denied":
          setDenied(e as unknown as SectionLock);
          break;
        case "notify.update":
          notifyRef.current?.({
            page_id: e.page_id as string,
            title: e.title as string,
          });
          break;
      }
    });
    sockRef.current = socket;
    return () => {
      socket.close();
      sockRef.current = null;
      setConnected(false);
    };
  }, [pageId, enabled]);

  const acquire = useCallback((sectionId: string) => {
    sockRef.current?.send({ type: "lock.acquire", section_id: sectionId });
  }, []);
  const release = useCallback((sectionId: string) => {
    sockRef.current?.send({ type: "lock.release", section_id: sectionId });
  }, []);

  return { connected, present, locks, acquire, release, denied };
}
