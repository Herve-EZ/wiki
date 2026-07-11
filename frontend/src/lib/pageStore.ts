/**
 * Offline-aware page load/save. Orchestrates the API, the local SQLite mirror
 * and the outbox so the editor component never has to branch on connectivity.
 */
import { NetworkError, api } from "./api";
import { cachePageFromServer, getCachedPage, recordLocalEdit } from "./db";
import { isTauri } from "./platform";
import type { CachedPage, Page } from "./types";

export interface SaveResult {
  page: Page;
  queued: boolean; // true = stored locally, awaiting sync
}

export type PagePatch = Partial<Pick<Page, "title" | "content_md" | "status">>;

/** Load a page: server first when online, local mirror as the fallback. */
export async function loadPage(id: string, online: boolean): Promise<Page> {
  if (online) {
    try {
      const page = await api.getPage(id);
      if (isTauri()) await cachePageFromServer(page);
      return page;
    } catch (err) {
      if (!(err instanceof NetworkError)) throw err;
    }
  }
  if (isTauri()) {
    const cached = await getCachedPage(id);
    if (cached) return cached;
  }
  throw new NetworkError();
}

/** Save a patch: straight to the server online, otherwise queued locally. */
export async function savePage(
  page: Page,
  patch: PagePatch,
  online: boolean,
): Promise<SaveResult> {
  if (online) {
    try {
      const updated = await api.updatePage(page.id, patch);
      if (isTauri()) await cachePageFromServer(updated);
      return { page: updated, queued: false };
    } catch (err) {
      if (!(err instanceof NetworkError)) throw err;
    }
  }
  if (isTauri()) {
    let cached: CachedPage | null = await getCachedPage(page.id);
    if (!cached) {
      await cachePageFromServer(page);
      cached = await getCachedPage(page.id);
    }
    if (cached) {
      await recordLocalEdit(cached, patch);
      return { page: { ...page, ...patch }, queued: true };
    }
  }
  throw new NetworkError();
}
