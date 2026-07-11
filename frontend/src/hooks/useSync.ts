import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { flushOutbox } from "../lib/sync";
import { useNetworkStatus } from "./useNetworkStatus";
import { useOutboxCount } from "./useOutboxCount";
import { useConflictCount } from "./useConflictCount";

export interface SyncState {
  online: boolean;
  /** Edits queued locally, waiting to be pushed. */
  pending: number;
  /** Queued edits that failed to push (conflict / deleted page). */
  conflicts: number;
  syncing: boolean;
  lastSyncAt: number | null;
  /** Push queued edits, then refetch server data so the UI reloads live. */
  sync: () => Promise<void>;
  refresh: () => void;
}

/** One-stop sync surface: counts, status, and a manual "sync now" that flushes
 * the outbox and reloads server data dynamically. */
export function useSync(): SyncState {
  const qc = useQueryClient();
  const online = useNetworkStatus();
  const { count: pending, refresh: refreshPending } = useOutboxCount();
  const { count: conflicts, refresh: refreshConflicts } = useConflictCount();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const refresh = useCallback(() => {
    refreshPending();
    refreshConflicts();
  }, [refreshPending, refreshConflicts]);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await flushOutbox();
      // Reload every active query so the UI reflects the server immediately.
      await qc.invalidateQueries();
      setLastSyncAt(Date.now());
    } finally {
      refresh();
      setSyncing(false);
    }
  }, [syncing, qc, refresh]);

  return { online, pending, conflicts, syncing, lastSyncAt, sync, refresh };
}
