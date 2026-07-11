/**
 * Reachability of the backend, not just the browser's navigator.onLine.
 * navigator.onLine only knows about the network interface; a machine can be
 * "online" while the WikiCollab server is down. We combine both signals and
 * let callers report reachability explicitly after a failed/successful call.
 */
type Listener = (online: boolean) => void;

const listeners = new Set<Listener>();
let backendReachable = true;

function emit(): void {
  const state = isOnline();
  for (const l of listeners) l(state);
}

export function isOnline(): boolean {
  const navOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  return navOnline && backendReachable;
}

/** Called by the API/sync layer to record the outcome of a real request. */
export function reportBackendReachable(reachable: boolean): void {
  if (backendReachable !== reachable) {
    backendReachable = reachable;
    emit();
  }
}

export function subscribeOnline(listener: Listener): () => void {
  listeners.add(listener);
  const handler = () => emit();
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}
