/**
 * Block transclusion: `![[Page]]` or `![[Page#section-slug]]` alone on a line
 * includes another page's body (or one of its sections) in place, so shared
 * material lives in exactly one page instead of being copy-pasted.
 *
 * The host page only stores the reference, so resolving one is asynchronous:
 * `useTransclusions` fetches the target pages and hands the resolved bodies to
 * the markdown renderer through markdown-it's `env` (see lib/markdown.ts).
 */
import { splitSections } from "./sections";

/** `![[Target]]` / `![[Target#section]]`, alone on its line (block level). */
const TRANSCLUDE_RE = /^[ \t]*!\[\[([^[\]#|]+)(?:#([^[\]|]+))?\]\][ \t]*$/gm;

export interface TranscludeRef {
  /** Lookup key into a TranscludeMap — `target#section`, lowercased. */
  key: string;
  /** Page title or slug, as written by the author. */
  target: string;
  /** Section slug (from lib/sections), or "" for the whole page. */
  section: string;
}

export function transcludeKey(target: string, section: string): string {
  return `${target.trim().toLowerCase()}#${section.trim().toLowerCase()}`;
}

/** Every *distinct* transclusion reference in `src`, in order of appearance. */
export function parseTranscludeRefs(src: string): TranscludeRef[] {
  const refs: TranscludeRef[] = [];
  const seen = new Set<string>();
  for (const m of src.matchAll(TRANSCLUDE_RE)) {
    const target = m[1].trim();
    if (!target) continue;
    const section = (m[2] ?? "").trim();
    const key = transcludeKey(target, section);
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ key, target, section });
  }
  return refs;
}

export type Transclusion =
  /** Target page is still being fetched (or is unavailable offline). */
  | { status: "loading" }
  /** No page in this workspace matches the target. */
  | { status: "missing"; target: string }
  /** The page exists but has no section with that slug (renamed heading?). */
  | { status: "no-section"; pageId: string; pageTitle: string; section: string }
  /** The page includes itself. */
  | { status: "cycle" }
  | {
      status: "ok";
      pageId: string;
      pageTitle: string;
      /** Heading of the included section, or the page title for a whole page. */
      heading: string;
      /** Raw body of the included section, straight from the source page. */
      markdown: string;
    };

/** Resolved bodies keyed by `transcludeKey`, read by the markdown renderer. */
export type TranscludeMap = Map<string, Transclusion>;

/** Pull one section (by its lib/sections slug) out of a page body. */
export function extractSection(markdown: string, sectionId: string) {
  return splitSections(markdown).find((s) => s.id === sectionId);
}

/** Markdown token for a transclusion, as inserted by the editor. */
export function transcludeToken(target: string, section?: string): string {
  return section ? `![[${target}#${section}]]` : `![[${target}]]`;
}

/**
 * Replace every resolved `![[…]]` with the markdown it points at, so exports
 * (PDF, Word, .md) are self-contained documents rather than references only the
 * app can follow. References that didn't resolve are left as written.
 */
export function expandTransclusions(src: string, map: TranscludeMap): string {
  return src.replace(TRANSCLUDE_RE, (line, rawTarget: string, rawSection?: string) => {
    const res = map.get(transcludeKey(rawTarget, rawSection ?? ""));
    return res?.status === "ok" ? res.markdown : line;
  });
}
