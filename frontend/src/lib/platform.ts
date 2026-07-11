/**
 * Runtime capability detection. The same React bundle runs in two hosts:
 *  - a normal browser (web deployment) — no local SQLite, no native commands
 *  - the Tauri webview (desktop) — local mirror + native ops available
 *
 * Every desktop-only feature funnels through `isTauri()` so the web build
 * degrades gracefully instead of throwing on missing `__TAURI_INTERNALS__`.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
