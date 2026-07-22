/**
 * Pure text transforms for the Markdown editor. Each takes the current value and
 * selection and returns the next value plus where the selection should land, so
 * the caller can drive a plain <textarea> with no library.
 */
export interface EditResult {
  text: string;
  selStart: number;
  selEnd: number;
}

/** Wrap the selection with `before`/`after` (e.g. ** ** for bold). Toggles off
 * when the selection is already wrapped. */
export function wrapInline(
  text: string,
  start: number,
  end: number,
  before: string,
  after = before,
  placeholder = "texte",
): EditResult {
  const sel = text.slice(start, end);
  const outer = text.slice(start - before.length, start) === before &&
    text.slice(end, end + after.length) === after;
  if (outer) {
    // Unwrap: remove the surrounding markers.
    const next =
      text.slice(0, start - before.length) + sel + text.slice(end + after.length);
    return { text: next, selStart: start - before.length, selEnd: end - before.length };
  }
  const body = sel || placeholder;
  const next = text.slice(0, start) + before + body + after + text.slice(end);
  const s = start + before.length;
  return { text: next, selStart: s, selEnd: s + body.length };
}

/** Toggle a line prefix (e.g. "> ", "- ", "## ") on every line touched by the
 * selection. */
export function toggleLinePrefix(
  text: string,
  start: number,
  end: number,
  prefix: string,
): EditResult {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.indexOf("\n", end);
  const stop = lineEnd === -1 ? text.length : lineEnd;
  const block = text.slice(lineStart, stop);
  const lines = block.split("\n");
  const allHave = lines.every((l) => l.startsWith(prefix));
  const next = lines
    .map((l) => (allHave ? l.slice(prefix.length) : prefix + l))
    .join("\n");
  const result = text.slice(0, lineStart) + next + text.slice(stop);
  return { text: result, selStart: lineStart, selEnd: lineStart + next.length };
}

/** Insert a block of text at the caret, ensuring blank lines around it. */
export function insertBlock(
  text: string,
  start: number,
  end: number,
  block: string,
): EditResult {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
  const trail = after && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : "";
  const insert = lead + block + trail;
  const next = before + insert + after;
  const pos = start + lead.length + block.length;
  return { text: next, selStart: pos, selEnd: pos };
}

/** Insert a snippet verbatim at the caret. */
export function insertInline(
  text: string,
  start: number,
  end: number,
  snippet: string,
): EditResult {
  const next = text.slice(0, start) + snippet + text.slice(end);
  const pos = start + snippet.length;
  return { text: next, selStart: pos, selEnd: pos };
}
