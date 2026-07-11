/**
 * Wiki-style page links: `[[Target]]` or `[[target|Label]]`, where the target
 * matches another page's title or slug in the same workspace (same rule the
 * backend uses in services.detect_links). We resolve them to a `wiki:` URL that
 * the reader intercepts — `wiki:<id>` for an existing page, `wiki:!<target>` for
 * one that doesn't exist yet (offer to create).
 */
export interface PageRef {
  id: string;
  title: string;
  slug: string;
}

const WIKILINK_RE = /\[\[([^[\]|]+)(?:\|([^[\]]*))?\]\]/g;

export function buildPageIndex(pages: PageRef[]): Map<string, PageRef> {
  const index = new Map<string, PageRef>();
  for (const p of pages) {
    index.set(p.slug.toLowerCase(), p);
    index.set(p.title.toLowerCase(), p);
  }
  return index;
}

/** Rewrite `[[…]]` tokens into Markdown links pointing at a `wiki:` URL. */
export function preprocessWikilinks(src: string, index: Map<string, PageRef>): string {
  return src.replace(WIKILINK_RE, (_m, rawTarget: string, rawLabel?: string) => {
    const target = rawTarget.trim();
    const label = (rawLabel ?? rawTarget).trim();
    // Escape characters that would break the generated Markdown link text.
    const safe = label.replace(/[[\]]/g, "\\$&");
    const page = index.get(target.toLowerCase());
    return page
      ? `[${safe}](wiki:${page.id})`
      : `[${safe}](wiki:!${encodeURIComponent(target)})`;
  });
}

export type WikiTarget =
  | { kind: "page"; id: string }
  | { kind: "missing"; title: string };

/** Parse a `wiki:` href produced above back into a navigation intent. */
export function parseWikiHref(href: string): WikiTarget | null {
  if (!href.startsWith("wiki:")) return null;
  const rest = href.slice("wiki:".length);
  if (rest.startsWith("!")) {
    return { kind: "missing", title: decodeURIComponent(rest.slice(1)) };
  }
  return { kind: "page", id: rest };
}
