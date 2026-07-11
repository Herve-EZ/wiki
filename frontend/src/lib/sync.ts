/**
 * Outbox replay. On reconnect, mutations queued while offline are pushed to the
 * server in FIFO order. A push that fails with a NetworkError stops the run
 * (still offline) and leaves the entry for next time; an ApiError (e.g. a
 * conflict) is recorded on the entry so the UI can surface a merge decision
 * rather than silently dropping the edit.
 */
import { ApiError, NetworkError, api } from "./api";
import {
  clearDirty,
  dropOutboxEntry,
  markOutboxError,
  pendingOutbox,
} from "./db";
import type { Page } from "./types";
import { reportBackendReachable } from "./network";
import { isTauri } from "./platform";

export interface SyncResult {
  pushed: number;
  conflicts: number;
  stoppedOffline: boolean;
}

let running = false;

export async function flushOutbox(): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, conflicts: 0, stoppedOffline: false };
  if (!isTauri() || running) return result;
  running = true;
  try {
    for (const entry of await pendingOutbox()) {
      try {
        const patch = JSON.parse(entry.payload) as Partial<Page>;
        await api.updatePage(entry.page_id, patch);
        await dropOutboxEntry(entry.seq);
        await clearDirty(entry.page_id);
        result.pushed += 1;
      } catch (err) {
        if (err instanceof NetworkError) {
          reportBackendReachable(false);
          result.stoppedOffline = true;
          break; // still offline — try again on the next reconnect
        }
        if (err instanceof ApiError) {
          await markOutboxError(entry.seq, `${err.status}: ${err.detail}`);
          result.conflicts += 1;
          continue; // keep the entry for a manual merge decision
        }
        throw err;
      }
    }
    if (!result.stoppedOffline) reportBackendReachable(true);
  } finally {
    running = false;
  }
  return result;
}
