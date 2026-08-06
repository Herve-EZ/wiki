/**
 * Split a markdown document into editable sections at h1–h3 headings. Section
 * locks operate at this granularity: acquiring a lock on a section id lets you
 * edit just that block while others keep reading/editing the rest.
 */
export interface Section {
  id: string;
  headingText: string;
  level: number;
  text: string;
}

const HEADING = /^(#{1,3})\s+(.*)$/;
/** Opening/closing line of a fenced code block (``` or ~~~, 3+ markers). */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function splitSections(md: string): Section[] {
  const lines = md.split("\n");
  const raw: { headingText: string; level: number; lines: string[] }[] = [];
  let current: { headingText: string; level: number; lines: string[] } | null = null;

  // Marker of the fence we are inside, or null. A `#` line inside a code block
  // is a shell comment, not a heading — splitting there would invent a phantom
  // section (and a phantom TOC entry, lock target and include anchor).
  let fence: string | null = null;

  for (const line of lines) {
    const f = FENCE.exec(line);
    if (f) {
      if (fence == null) fence = f[1][0];
      // A closing fence must use the same marker character as the opening one.
      else if (f[1][0] === fence) fence = null;
    }

    const m = fence == null ? HEADING.exec(line) : null;
    if (m) {
      if (current) raw.push(current);
      current = { headingText: m[2].trim(), level: m[1].length, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    } else {
      current = { headingText: "", level: 0, lines: [line] };
    }
  }
  if (current) raw.push(current);

  const seen = new Set<string>();
  return raw.map((s, i) => {
    let id = s.headingText ? slugify(s.headingText) : `section-${i}`;
    if (!id || seen.has(id)) id = `${id || "section"}-${i}`;
    seen.add(id);
    return { id, headingText: s.headingText, level: s.level, text: s.lines.join("\n") };
  });
}

export function joinSections(sections: Section[]): string {
  return sections.map((s) => s.text).join("\n");
}
