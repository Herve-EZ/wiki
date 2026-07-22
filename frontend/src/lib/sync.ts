/**
 * Outbox replay. On reconnect, mutations queued while offline are pushed to the
 * server in FIFO order. A push that fails with a NetworkError stops the run
 * (still offline) and leaves the entry for next time; an ApiError (e.g. a
 * conflict) is recorded on the entry so the UI can surface a merge decision
 * rather than silently dropping the edit.
 */
import { ApiError, NetworkError, api, attachmentUrl } from "./api";
import {
  clearDirty,
  deletePendingUpload,
  dropOutboxEntry,
  listPendingUploads,
  markOutboxError,
  pendingOutbox,
  rewritePlaceholders,
} from "./db";
import type { Page } from "./types";
import { reportBackendReachable } from "./network";
import { isTauri } from "./platform";

function base64ToFile(b64: string, name: string, type: string): File {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes.buffer], name, { type: type || "application/octet-stream" });
}

/** Upload files queued offline, then rewrite their `pending:<id>` placeholders
 * to real URLs in the outbox and mirror. Returns true if it stopped because the
 * server is still unreachable. */
async function flushPendingUploads(): Promise<boolean> {
  for (const p of await listPendingUploads()) {
    try {
      const file = base64ToFile(p.data, p.filename, p.content_type);
      const att = await api.uploadAttachment(p.workspace, file);
      await rewritePlaceholders([{ from: `pending:${p.id}`, to: attachmentUrl(att.url) }]);
      await deletePendingUpload(p.id);
    } catch (err) {
      if (err instanceof NetworkError) return true; // still offline
      // Permanent failure (too large, workspace gone…): drop it so we don't loop.
      await deletePendingUpload(p.id);
    }
  }
  return false;
}

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
    // Files first: uploads rewrite the placeholders that the queued edits below
    // still carry, so the server receives real URLs, not `pending:` tokens.
    if (await flushPendingUploads()) {
      reportBackendReachable(false);
      result.stoppedOffline = true;
      return result;
    }
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
