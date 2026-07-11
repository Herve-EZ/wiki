import { Icon } from "./Icon";

interface Props {
  online: boolean;
  pending: number;
  conflicts: number;
  syncing: boolean;
  onSync: () => void;
}

/** Sidebar sync status + "sync now" action. Reflects online/offline, queued
 * edits and conflicts; clicking pushes the outbox and reloads server data. */
export function SyncButton({ online, pending, conflicts, syncing, onSync }: Props) {
  const label = syncing
    ? "Synchronisation…"
    : !online
      ? "Hors-ligne"
      : conflicts > 0
        ? `${conflicts} à résoudre`
        : pending > 0
          ? `${pending} en attente`
          : "À jour";

  const tone = conflicts > 0 ? "warn" : !online ? "off" : pending > 0 ? "pending" : "ok";

  return (
    <button
      className={`sb-sync ${tone}`}
      onClick={onSync}
      disabled={syncing}
      title={online ? "Synchroniser maintenant" : "Réseau indisponible — réessayer"}
    >
      <Icon
        name={!online && !syncing ? "wifiOff" : "refresh"}
        size={14}
        className={syncing ? "ic spin" : "ic"}
      />
      <span className="label">{label}</span>
      {!syncing && (pending > 0 || conflicts > 0) && (
        <span className="sync-badge">{conflicts > 0 ? conflicts : pending}</span>
      )}
    </button>
  );
}
