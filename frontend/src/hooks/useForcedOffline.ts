import { useCallback, useEffect, useState } from "react";
import { isForcedOffline, setForcedOffline, subscribeOnline } from "../lib/network";

/** Manual "work offline" switch (desktop). Returns the current value and a
 * setter; stays in sync if toggled elsewhere. */
export function useForcedOffline(): [boolean, (v: boolean) => void] {
  const [forced, setForced] = useState(isForcedOffline());
  useEffect(() => subscribeOnline(() => setForced(isForcedOffline())), []);
  const set = useCallback((v: boolean) => setForcedOffline(v), []);
  return [forced, set];
}
