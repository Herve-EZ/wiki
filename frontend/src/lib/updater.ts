/**
 * Self-update via GitHub Releases (desktop only). The Rust updater plugin
 * fetches `latest.json` from the release assets, verifies the minisign
 * signature against the pubkey baked into `tauri.conf.json`, then downloads
 * and installs the platform package. On web this whole module is a no-op.
 */
import { isTauri } from "./platform";
import type { Update } from "@tauri-apps/plugin-updater";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  notes: string;
  date: string | null;
}

/** Kept between check and install so we only hit the network once. */
let pending: Update | null = null;

/**
 * Returns the available update, or null when already up to date / not on
 * desktop. Network or config errors are thrown — callers decide whether to
 * surface them (manual check) or swallow them (silent startup check).
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri()) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) {
    pending = null;
    return null;
  }
  pending = update;
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body ?? "",
    date: update.date ?? null,
  };
}

/**
 * Downloads and installs the update found by `checkForUpdate`.
 * `onProgress` receives 0..100, or null when the total size is unknown.
 */
export async function downloadAndInstall(
  onProgress: (percent: number | null) => void,
): Promise<void> {
  if (!pending) throw new Error("Aucune mise à jour en attente");
  let total = 0;
  let received = 0;
  await pending.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? 0;
        onProgress(total ? 0 : null);
        break;
      case "Progress":
        received += event.data.chunkLength;
        onProgress(total ? Math.min(100, Math.round((received / total) * 100)) : null);
        break;
      case "Finished":
        onProgress(100);
        break;
    }
  });
}

/** Restart the app so the freshly installed version takes over. */
export async function relaunchApp(): Promise<void> {
  if (!isTauri()) return;
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
