import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isTauri } from "../lib/platform";
import { checkForUpdate, type UpdateInfo } from "../lib/updater";
import { AboutModal } from "./modals/AboutModal";
import { UpdateModal } from "./modals/UpdateModal";

/** Réactions côté webview au menu natif (voir `src-tauri/src/menu.rs`).
 *
 * Reçoit les ids d'items via l'événement Tauri `menu:action` :
 *  - navigation (Préférences, Aide) gérée ici avec le router ;
 *  - actions contextuelles (nouvelle page, recherche, export) rediffusées en
 *    CustomEvent DOM `menu:<id>` pour que l'écran concerné les attrape ;
 *  - mises à jour / à propos : modales rendues ici.
 *
 * Vérifie aussi silencieusement au démarrage si une nouvelle version est
 * disponible sur GitHub Releases et la propose le cas échéant. */
export function MenuBridge() {
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checkResult, setCheckResult] = useState<"none" | "error" | null>(null);
  const checking = useRef(false);

  const manualCheck = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const info = await checkForUpdate();
      if (info) setUpdate(info);
      else setCheckResult("none");
    } catch {
      setCheckResult("error");
    } finally {
      checking.current = false;
    }
  }, []);

  // Menu natif → actions.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const stop = await listen<string>("menu:action", (e) => {
        switch (e.payload) {
          case "settings":
            navigate("/settings");
            break;
          case "help":
            navigate("/help");
            break;
          case "about":
          case "credits":
            setAboutOpen(true);
            break;
          case "check-updates":
            void manualCheck();
            break;
          default:
            // new-page, search, export-page : gérés par l'écran courant.
            window.dispatchEvent(new CustomEvent(`menu:${e.payload}`));
        }
      });
      if (disposed) stop();
      else unlisten = stop;
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [navigate, manualCheck]);

  // Vérification silencieuse au démarrage (desktop uniquement).
  useEffect(() => {
    if (!isTauri()) return;
    const t = setTimeout(() => {
      void checkForUpdate()
        .then((info) => {
          if (info) setUpdate(info);
        })
        .catch(() => {
          /* hors-ligne ou endpoint indisponible : on réessaiera au prochain lancement */
        });
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {aboutOpen && (
        <AboutModal onClose={() => setAboutOpen(false)} onCheckUpdates={() => void manualCheck()} />
      )}
      {update && <UpdateModal info={update} onClose={() => setUpdate(null)} />}
      {checkResult && (
        <div className="overlay" onClick={() => setCheckResult(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <h4>Mises à jour</h4>
            <p className="sub">
              {checkResult === "none"
                ? "Vous utilisez déjà la dernière version de WikiCollab."
                : "Impossible de vérifier les mises à jour. Vérifiez votre connexion et réessayez."}
            </p>
            <div style={{ display: "flex", marginTop: 12 }}>
              <button
                className="btn btn-primary"
                style={{ marginLeft: "auto" }}
                onClick={() => setCheckResult(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
