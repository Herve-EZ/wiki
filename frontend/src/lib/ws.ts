/**
 * Reconnecting WebSocket client for the page channel. Carries the JWT in the
 * query string (matching the backend's JWTAuthMiddleware), sends a heartbeat
 * every 30s, and reconnects with capped exponential backoff. Realtime is an
 * online-only feature: in degraded mode the socket simply stays closed.
 */
import { loadTokens } from "./auth";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";
const HEARTBEAT_MS = 30_000;
const MAX_BACKOFF_MS = 30_000;

export type WsEvent = { type: string; [key: string]: unknown };
type Handler = (event: WsEvent) => void;

export interface PageSocket {
  send(event: WsEvent): void;
  close(): void;
}

export function connectPage(pageId: string, onEvent: Handler): PageSocket {
  let socket: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let retry = 0;
  let closedByCaller = false;

  async function open(): Promise<void> {
    const tokens = await loadTokens();
    if (!tokens?.access || closedByCaller) return;
    const ws = new WebSocket(`${WS_URL}/ws/page/${pageId}/?token=${tokens.access}`);
    socket = ws;

    ws.onopen = () => {
      retry = 0;
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "heartbeat" }));
      }, HEARTBEAT_MS);
    };
    ws.onmessage = (msg) => {
      try {
        onEvent(JSON.parse(msg.data as string) as WsEvent);
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      if (!closedByCaller) {
        // Exponential backoff with jitter, so many clients don't reconnect in
        // lockstep after a server blip.
        const base = Math.min(1000 * 2 ** retry, MAX_BACKOFF_MS);
        const delay = base + Math.random() * 400;
        retry += 1;
        setTimeout(open, delay);
      }
    };
  }

  void open();

  return {
    send(event) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
    },
    close() {
      closedByCaller = true;
      if (heartbeat) clearInterval(heartbeat);
      socket?.close();
    },
  };
}
