import { useEffect, useState } from "react";
import { isOnline, subscribeOnline } from "../lib/network";

/** Live backend reachability (navigator.onLine ∧ last request succeeded). */
export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState<boolean>(isOnline());
  useEffect(() => subscribeOnline(setOnline), []);
  return online;
}
