import { useState } from "react";
import { Icon } from "../Icon";
import {
  type Align,
  type TableModel,
  emptyTable,
  generateTable,
} from "../../lib/tables";

interface Props {
  /** Prefill for editing an existing table; omit to start blank. */
  initial?: TableModel;
  onInsert: (markdown: string) => void;
  onClose: () => void;
}

const ALIGN_CYCLE: Align[] = ["none", "left", "center", "right"];
const ALIGN_ICON: Record<Align, string> = {
  none: "alignLeft",
  left: "alignLeft",
  center: "alignCenter",
  right: "alignRight",
};
const ALIGN_LABEL: Record<Align, string> = {
  none: "Par défaut",
  left: "Gauche",
  center: "Centré",
  right: "Droite",
};

/** Visual grid editor that round-trips to a portable GFM pipe table. */
export function TableEditor({ initial, onInsert, onClose }: Props) {
  const [model, setModel] = useState<TableModel>(() => initial ?? emptyTable());

  const cols = model.headers.length;

  function update(fn: (m: TableModel) => TableModel) {
    setModel((m) => fn(structuredClone(m)));
  }

  const setHeader = (c: number, v: string) =>
    update((m) => {
      m.headers[c] = v;
      return m;
    });
  const setCell = (r: number, c: number, v: string) =>
    update((m) => {
      m.rows[r][c] = v;
      return m;
    });
  const cycleAlign = (c: number) =>
    update((m) => {
      const i = ALIGN_CYCLE.indexOf(m.align[c]);
      m.align[c] = ALIGN_CYCLE[(i + 1) % ALIGN_CYCLE.length];
      return m;
    });

  const addColumn = () =>
    update((m) => {
      m.headers.push(`Colonne ${m.headers.length + 1}`);
      m.align.push("none");
      m.rows.forEach((r) => r.push(""));
      return m;
    });
  const removeColumn = (c: number) =>
    update((m) => {
      if (m.headers.length <= 1) return m;
      m.headers.splice(c, 1);
      m.align.splice(c, 1);
      m.rows.forEach((r) => r.splice(c, 1));
      return m;
    });
  const addRow = () =>
    update((m) => {
      m.rows.push(Array.from({ length: m.headers.length }, () => ""));
      return m;
    });
  const removeRow = (r: number) =>
    update((m) => {
      if (m.rows.length <= 1) return m;
      m.rows.splice(r, 1);
      return m;
    });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card table-editor" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title" style={{ marginBottom: 12 }}>
          <Icon name="table" size={17} />
          <h4 style={{ margin: 0 }}>{initial ? "Modifier le tableau" : "Insérer un tableau"}</h4>
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          Cliquez sur l'en-tête d'une colonne pour changer son alignement. Le tableau
          est enregistré en Markdown standard.
        </p>

        <div className="table-editor-scroll">
          <table className="table-editor-grid">
            <thead>
              <tr>
                {model.headers.map((h, c) => (
                  <th key={c}>
                    <div className="te-colhead">
                      <button
                        type="button"
                        className="te-align"
                        title={`Alignement : ${ALIGN_LABEL[model.align[c]]}`}
                        onClick={() => cycleAlign(c)}
                      >
                        <Icon name={ALIGN_ICON[model.align[c]]} size={13} />
                      </button>
                      <input
                        className="te-input te-header-input"
                        value={h}
                        placeholder={`Colonne ${c + 1}`}
                        onChange={(e) => setHeader(c, e.target.value)}
                      />
                      <button
                        type="button"
                        className="te-del"
                        title="Supprimer la colonne"
                        disabled={cols <= 1}
                        onClick={() => removeColumn(c)}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="te-add-col">
                  <button type="button" className="te-addbtn" title="Ajouter une colonne" onClick={addColumn}>
                    <Icon name="plus" size={13} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>
                      <input
                        className="te-input"
                        value={cell}
                        onChange={(e) => setCell(r, c, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="te-row-actions">
                    <button
                      type="button"
                      className="te-del"
                      title="Supprimer la ligne"
                      disabled={model.rows.length <= 1}
                      onClick={() => removeRow(r)}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
          <button type="button" className="btn btn-ghost" onClick={addRow}>
            <Icon name="plus" size={13} /> Ajouter une ligne
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onInsert(generateTable(model))}
            >
              <Icon name="check" size={13} /> {initial ? "Mettre à jour" : "Insérer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
