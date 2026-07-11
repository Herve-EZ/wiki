import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { openExternal, systemInfo, type SystemInfo } from "../../lib/native";

interface Props {
  /** "version" : infos techniques + mises à jour. "credits" : auteur et licence. */
  view: "version" | "credits";
  onClose: () => void;
  onCheckUpdates: () => void;
}

/** Modales du menu natif Aide → « Version de l'application » et « Crédits ». */
export function AboutModal({ view, onClose, onCheckUpdates }: Props) {
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
              {view === "version"
                ? info
                  ? `Version ${info.app_version}`
                  : "Version web"
                : "Wiki collaboratif d'équipe"}
            </p>
          </div>
        </div>

        {view === "version" ? (
          <div className="about-section">
            <h5>Détails</h5>
            <p className="sub">
              {info
                ? `Système : ${info.os} (${info.arch})`
                : "Exécutée dans le navigateur — la version installée n'est pas concernée."}
            </p>
          </div>
        ) : (
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
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {view === "version" && info && (
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
