import { Icon } from "../Icon";
import type { DiffResult } from "../../lib/types";

interface Row {
  cls: "ctx" | "add" | "del";
  oldNo: number | null;
  newNo: number | null;
  text: string;
}

function buildRows(diff: DiffResult): { rows: Row[]; added: number; removed: number } {
  const rows: Row[] = [];
  let oldNo = 1;
  let newNo = 1;
  let added = 0;
  let removed = 0;

  for (const op of diff.ops) {
    if (op.op === "equal") {
      for (const line of op.from_lines) {
        rows.push({ cls: "ctx", oldNo: oldNo++, newNo: newNo++, text: `  ${line}` });
      }
    } else {
      for (const line of op.from_lines) {
        rows.push({ cls: "del", oldNo: oldNo++, newNo: null, text: `- ${line}` });
        removed++;
      }
      for (const line of op.to_lines) {
        rows.push({ cls: "add", oldNo: null, newNo: newNo++, text: `+ ${line}` });
        added++;
      }
    }
  }
  return { rows, added, removed };
}

const pad = (n: number | null): string => (n === null ? "   " : String(n).padStart(3));

interface Props {
  diff: DiffResult;
  fromN: number;
  toN: number;
  onRestore: () => void;
  restoring: boolean;
  canRestore: boolean;
}

export function DiffView({ diff, fromN, toN, onRestore, restoring, canRestore }: Props) {
  const { rows, added, removed } = buildRows(diff);
  return (
    <div className="diffpane">
      <div className="diff-head">
        Comparaison <b>v{fromN} → v{toN}</b>
        <span className="stat-add">+{added}</span>
        <span className="stat-del">−{removed}</span>
      </div>
      <div className="diff-body">
        {rows.map((r, i) => (
          <div key={i} className={`dl ${r.cls}`}>
            <span className="gut">{`${pad(r.oldNo)} ${pad(r.newNo)}`}</span>
            <span className="txt">{r.text}</span>
          </div>
        ))}
      </div>
      {canRestore && (
        <div className="diff-foot">
          <button className="btn btn-primary" onClick={onRestore} disabled={restoring}>
            <Icon name="refresh" size={13} />
            {restoring ? "Restauration…" : `Restaurer la v${fromN}`}
          </button>
          <span className="diff-note">
            L'historique est immuable — la restauration ajoute une version, elle n'en supprime jamais.
          </span>
        </div>
      )}
    </div>
  );
}
