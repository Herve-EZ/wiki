import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useIsDark } from "../hooks/useIsDark";
import { renderDiagram } from "../lib/mermaid";
import { saveBinaryFile } from "../lib/native";

type State =
  | { status: "loading" }
  | { status: "ready"; svg: string }
  | { status: "error"; message: string };

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

interface Props {
  source: string;
}

/**
 * A rendered Mermaid diagram, with the things a diagram needs and didn't have:
 * a scroll container so a wide graph doesn't break the column, zoom for the
 * dense ones, an SVG download, a redraw when the theme flips, and a readable
 * message when the source doesn't parse instead of Mermaid's own error box.
 */
export function MermaidFigure({ source }: Props) {
  const dark = useIsDark();
  const [state, setState] = useState<State>({ status: "loading" });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    void renderDiagram(source, dark).then((result) => {
      if (cancelled) return;
      setState(
        result.ok
          ? { status: "ready", svg: result.svg }
          : { status: "error", message: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [source, dark]);

  async function download() {
    if (state.status !== "ready") return;
    const bytes = new TextEncoder().encode(state.svg);
    await saveBinaryFile("diagramme.svg", bytes, [{ name: "SVG", extensions: ["svg"] }]);
  }

  if (state.status === "loading") {
    return (
      <div className="mmd mmd-loading" aria-busy="true">
        <span className="spinner" />
        <span>Rendu du diagramme…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mmd mmd-error" role="alert">
        <p className="mmd-error-head">
          <Icon name="alert" size="sm" />
          Ce diagramme ne peut pas être dessiné. {state.message}
        </p>
        <details>
          <summary>Voir la source</summary>
          <pre>{source}</pre>
        </details>
      </div>
    );
  }

  return (
    <figure className="mmd">
      <div className="mmd-scroll">
        <div
          className="mmd-canvas"
          style={{ zoom }}
          // Mermaid renders with securityLevel "strict", which sanitises the
          // SVG it returns.
          dangerouslySetInnerHTML={{ __html: state.svg }}
        />
      </div>
      <div className="mmd-tools">
        <button
          className="icon-btn"
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
          disabled={zoom <= ZOOM_MIN}
          title="Réduire"
          aria-label="Réduire le diagramme"
        >
          <Icon name="zoomOut" size="sm" />
        </button>
        <button
          className="mmd-zoom-value"
          onClick={() => setZoom(1)}
          title="Taille d'origine"
          aria-label="Revenir à la taille d'origine"
        >
          {Math.round(zoom * 100)} %
        </button>
        <button
          className="icon-btn"
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
          disabled={zoom >= ZOOM_MAX}
          title="Agrandir"
          aria-label="Agrandir le diagramme"
        >
          <Icon name="zoomIn" size="sm" />
        </button>
        <button
          className="icon-btn"
          onClick={() => void download()}
          title="Télécharger le SVG"
          aria-label="Télécharger le diagramme en SVG"
        >
          <Icon name="download" size="sm" />
        </button>
      </div>
    </figure>
  );
}
