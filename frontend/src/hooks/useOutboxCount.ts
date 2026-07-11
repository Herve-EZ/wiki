import { useCallback, useEffect, useState } from "react";
import { outboxCount } from "../lib/db";
import { isTauri } from "../lib/platform";

/** Number of edits waiting to sync (desktop only). Poll-refreshed + on demand. */
export function useOutboxCount(): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!isTauri()) return;
    outboxCount()
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
