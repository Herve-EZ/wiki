import { useState } from "react";
import { Icon } from "../Icon";
import { downloadAndInstall, relaunchApp, type UpdateInfo } from "../../lib/updater";

interface Props {
  info: UpdateInfo;
  onClose: () => void;
}

type Phase = "idle" | "downloading" | "restarting" | "error";

/** Proposé quand une nouvelle version est disponible sur GitHub Releases :
 * notes de version, téléchargement avec progression, puis redémarrage.
 * Sous Windows l'installeur ferme lui-même l'application ; ailleurs on
 * relance explicitement une fois l'installation terminée. */
export function UpdateModal({ info, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState<number | null>(0);

  async function install() {
    setPhase("downloading");
    try {
      await downloadAndInstall(setPercent);
      setPhase("restarting");
      await relaunchApp();
    } catch {
      setPhase("error");
    }
  }

  const busy = phase === "downloading" || phase === "restarting";

  return (
    <div className="overlay" onClick={busy ? undefined : onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h4>
          <Icon name="download" size={15} /> Mise à jour disponible
        </h4>
        <p className="sub">
          WikiCollab {info.version} est disponible (vous utilisez la {info.currentVersion}).
        </p>

        {info.notes && phase === "idle" && (
          <div className="update-notes">{info.notes}</div>
        )}

        {phase === "downloading" && (
          <div className="update-progress">
            <div className="progress-track">
              <div
                className={`progress-fill${percent === null ? " indeterminate" : ""}`}
                style={percent === null ? undefined : { width: `${percent}%` }}
              />
            </div>
            <span className="sub">
              {percent === null ? "Téléchargement…" : `Téléchargement… ${percent}%`}
            </span>
          </div>
        )}

        {phase === "restarting" && (
          <p className="sub">
            <span className="spinner" style={{ width: 12, height: 12 }} /> Installation…
            l'application va redémarrer.
          </p>
        )}

        {phase === "error" && (
          <p className="form-error">
            Échec du téléchargement de la mise à jour. Réessayez plus tard ou
            téléchargez-la depuis la page des releases GitHub.
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {!busy && (
            <button className="btn btn-ghost" onClick={onClose}>
              Plus tard
            </button>
          )}
          {(phase === "idle" || phase === "error") && (
            <button
              className="btn btn-primary"
              style={{ marginLeft: "auto" }}
              onClick={() => void install()}
            >
              {phase === "error" ? "Réessayer" : "Installer et redémarrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
