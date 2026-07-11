import { useCallback, useEffect, useState } from "react";
import { conflictCount } from "../lib/db";
import { isTauri } from "../lib/platform";

/** Number of queued edits that failed to push — conflicts or pages that no
 * longer exist on the server (desktop only). Poll-refreshed + on demand. */
export function useConflictCount(): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!isTauri()) return;
    conflictCount()
      .then(setCount)
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return { count, refresh };
}
