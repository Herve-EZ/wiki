import { Icon } from "./Icon";

interface Props {
  online: boolean;
  pending: number;
  conflicts: number;
  onRetry: () => void;
}

/** Thin banner shown only when there's something to say: offline with queued
 * edits, or edits that came back in conflict and need attention. */
export function OfflineBanner({ online, pending, conflicts, onRetry }: Props) {
  if (online && pending === 0 && conflicts === 0) return null;

  return (
    <div className="banner-offline">
      <Icon name={online ? "alert" : "wifiOff"} size={14} />
      {!online && "Mode dégradé — vos modifications sont enregistrées en local."}
      {online && conflicts > 0 &&
        `${conflicts} modification${conflicts > 1 ? "s" : ""} en conflit à résoudre.`}
      {online && conflicts === 0 && pending > 0 &&
        `${pending} modification${pending > 1 ? "s" : ""} en attente de synchronisation.`}
      {online && pending > 0 && (
        <button className="link" style={{ marginLeft: 8 }} onClick={onRetry}>
          Synchroniser maintenant
        </button>
      )}
    </div>
  );
}
