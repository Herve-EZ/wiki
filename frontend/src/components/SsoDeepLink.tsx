import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { isTauri } from "../lib/platform";
import { useAuth } from "../auth/AuthContext";

/** Pull the one-time code out of a wikicollab://auth?code=... deep link. */
function extractCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get("code");
    if (code) return code;
  } catch {
    // custom-scheme URLs aren't always parseable by URL() on every platform
  }
  const match = url.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Desktop-only: completes SSO login. After the browser flow, the backend hands
 * the app a one-time code via the wikicollab:// deep link; we exchange it for
 * JWT tokens (same outcome as password login). No-op on web.
 */
export function SsoDeepLink() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const busy = useRef(false);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;

    async function handle(urls: string[] | string | null) {
      if (!urls) return;
      const list = Array.isArray(urls) ? urls : [urls];
      for (const url of list) {
        if (busy.current || !url?.startsWith("wikicollab://")) continue;
        const code = extractCode(url);
        if (!code) continue;
        busy.current = true;
        try {
          const res = await api.ssoExchange(code);
          if (res.kind === "tokens") {
            await refresh();
            navigate("/", { replace: true });
          } else {
            navigate("/login", { replace: true, state: { challengeToken: res.challengeToken } });
          }
        } catch {
          navigate("/login", { replace: true });
        } finally {
          busy.current = false;
        }
      }
    }

    void (async () => {
      const dl = await import("@tauri-apps/plugin-deep-link");
      try {
        await handle(await dl.getCurrent()); // cold start (app launched by link)
      } catch {
        // no launch URL
      }
      unlisten = await dl.onOpenUrl((urls) => void handle(urls));
    })();

    return () => unlisten?.();
  }, [navigate, refresh]);

  return null;
}
