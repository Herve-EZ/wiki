export type Segment =
  | { kind: "markdown"; text: string }
  | { kind: "diagram"; source: string };

const OPEN = /^```mermaid[ \t]*$/;
const CLOSE = /^```[ \t]*$/;

/**
 * Split a section's Markdown at top-level ```mermaid fences.
 *
 * The reader used to render the whole section to HTML and then reach into the
 * DOM to turn `<pre class="mermaid">` into a diagram. That put an imperative DOM
 * mutation inside a React effect, and StrictMode's double invocation broke it —
 * which is why diagrams showed in print but not on screen. Splitting first lets
 * the diagram be a plain React child: nothing to find, nothing to replace.
 *
 * Only fences that start at column 0 are split. One nested in a list item stays
 * in its Markdown segment and renders as a code block — visible source rather
 * than a silent hole.
 */
export function splitDiagrams(source: string): Segment[] {
  const lines = source.split("\n");
  const segments: Segment[] = [];
  let buffer: string[] = [];

  function flush() {
    if (buffer.length > 0) {
      segments.push({ kind: "markdown", text: buffer.join("\n") });
      buffer = [];
    }
  }

  let i = 0;
  while (i < lines.length) {
    if (OPEN.test(lines[i])) {
      let end = i + 1;
      while (end < lines.length && !CLOSE.test(lines[end])) end++;
      if (end < lines.length) {
        flush();
        segments.push({ kind: "diagram", source: lines.slice(i + 1, end).join("\n") });
        i = end + 1;
        continue;
      }
      // Unterminated fence: leave it to the Markdown renderer.
    }
    buffer.push(lines[i]);
    i++;
  }
  flush();

  return segments;
}
