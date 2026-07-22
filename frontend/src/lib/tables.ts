/**
 * GFM pipe-table helpers: a small model plus round-tripping to/from Markdown.
 * Kept dependency-free so it works offline and produces portable, diffable GFM.
 */
export type Align = "none" | "left" | "center" | "right";

export interface TableModel {
  /** Header cells (one per column). */
  headers: string[];
  /** Body rows; each row has one cell per column. */
  rows: string[][];
  /** Column alignment, one per column. */
  align: Align[];
}

export function emptyTable(cols = 3, bodyRows = 2): TableModel {
  return {
    headers: Array.from({ length: cols }, (_, i) => `Colonne ${i + 1}`),
    rows: Array.from({ length: bodyRows }, () => Array.from({ length: cols }, () => "")),
    align: Array.from({ length: cols }, () => "none" as Align),
  };
}

function alignMarker(a: Align): string {
  switch (a) {
    case "left":
      return ":---";
    case "center":
      return ":--:";
    case "right":
      return "---:";
    default:
      return "---";
  }
}

/** Escape a cell for pipe-table syntax (pipes and newlines). */
function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

export function generateTable(t: TableModel): string {
  const cols = t.headers.length;
  const header = "| " + t.headers.map(escapeCell).join(" | ") + " |";
  const sep = "| " + t.align.slice(0, cols).map(alignMarker).join(" | ") + " |";
  const body = t.rows
    .map((r) => {
      const cells = Array.from({ length: cols }, (_, i) => escapeCell(r[i] ?? ""));
      return "| " + cells.join(" | ") + " |";
    })
    .join("\n");
  return body ? `${header}\n${sep}\n${body}` : `${header}\n${sep}`;
}

function splitRow(line: string): string[] {
  // Split on unescaped pipes, then trim and unescape.
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "\\" && trimmed[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (ch === "|") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function parseAlign(cell: string): Align {
  const c = cell.trim();
  const left = c.startsWith(":");
  const right = c.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "none";
}

const SEP_RE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

/** Detect and parse a GFM table. Returns the model plus the matched line span. */
export function parseTableAt(
  text: string,
): { model: TableModel; start: number; end: number } | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].includes("|")) continue;
    if (!SEP_RE.test(lines[i + 1])) continue;
    const headers = splitRow(lines[i]);
    const align = splitRow(lines[i + 1]).map(parseAlign);
    const rows: string[][] = [];
    let j = i + 2;
    for (; j < lines.length; j++) {
      if (!lines[j].includes("|") || lines[j].trim() === "") break;
      rows.push(splitRow(lines[j]));
    }
    // Char offsets of the table block.
    const start = lines.slice(0, i).join("\n").length + (i > 0 ? 1 : 0);
    const end = lines.slice(0, j).join("\n").length;
    const cols = headers.length;
    const normRows = rows.map((r) =>
      Array.from({ length: cols }, (_, k) => r[k] ?? ""),
    );
    const normAlign = Array.from({ length: cols }, (_, k) => align[k] ?? "none");
    return { model: { headers, rows: normRows, align: normAlign }, start, end };
  }
  return null;
}
