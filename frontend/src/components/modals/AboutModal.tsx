import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { openExternal, systemInfo, type SystemInfo } from "../../lib/native";

interface Props {
  onClose: () => void;
  onCheckUpdates: () => void;
}

/** "À propos" : version de l'application, plateforme et crédits.
 * Ouvert depuis le menu natif Aide → Version de l'application / Crédits. */
export function AboutModal({ onClose, onCheckUpdates }: Props) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  useEffect(() => {
    void systemInfo().then(setInfo);
  }, []);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card about-card" onClick={(e) => e.stopPropagation()}>
        <div className="about-head">
          <div className="about-logo">
            <Icon name="book" size={26} />
          </div>
          <div>
            <h4 style={{ margin: 0 }}>WikiCollab</h4>
            <p className="sub" style={{ margin: 0 }}>
              {info ? `Version ${info.app_version}` : "Version web"}
              {info && ` — ${info.os} (${info.arch})`}
            </p>
          </div>
        </div>

        <div className="about-section">
          <h5>Crédits</h5>
          <p>
            Conçu et développé par <strong>EZ Audiovisuel</strong>.
          </p>
          <p className="sub">
            Construit avec Tauri, React, Django Channels et PostgreSQL.
            Distribué sous licence MIT.
          </p>
          <button
            className="link"
            onClick={() => void openExternal("https://github.com/Herve-EZ/Wiki")}
          >
            <Icon name="link" size={12} /> Code source sur GitHub
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {info && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                onClose();
                onCheckUpdates();
              }}
            >
              <Icon name="refresh" size={13} /> Rechercher des mises à jour
            </button>
          )}
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
