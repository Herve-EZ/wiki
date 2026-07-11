import { Icon } from "./Icon";
import type { PresentUser } from "../hooks/usePageSocket";

interface Props {
  present: PresentUser[];
  lockCount: number;
  online: boolean;
}

export function PresenceBar({ present, lockCount, online }: Props) {
  const n = present.length;
  return (
    <div className="presence-bar">
      {online ? (
        <>
          <span className="dot-live" />
          {n > 0
            ? `${n} personne${n > 1 ? "s" : ""} sur cette page`
            : "Vous êtes seul sur cette page"}
        </>
      ) : (
        <>
          <Icon name="wifiOff" size={13} style={{ color: "var(--warn)" }} />
          Temps réel indisponible — mode dégradé
        </>
      )}
      {lockCount > 0 && (
        <span className="lock-badge" style={{ marginLeft: "auto" }}>
          <Icon name="lock" size={10} />
          {lockCount} section{lockCount > 1 ? "s" : ""} verrouillée{lockCount > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
