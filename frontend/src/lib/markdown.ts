import MarkdownIt from "markdown-it";
import { transcludeKey, type TranscludeMap } from "./transclude";
import { preprocessWikilinks, type PageRef } from "./wikilinks";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

/** Extra context a caller can hand the renderer (see renderMarkdown). */
export interface RenderEnv {
  /** Resolved `![[…]]` bodies, keyed by transcludeKey. */
  transclusions?: TranscludeMap;
  /** Page index used to turn `[[links]]` inside an included body into links. */
  pageIndex?: Map<string, PageRef>;
  /** Nesting depth — a transcluded body may not itself transclude. */
  transcludeDepth?: number;
}

// Allow our internal `wiki:` scheme (page links) through the link validator.
const defaultValidate = md.validateLink.bind(md);
md.validateLink = (url: string) => url.startsWith("wiki:") || defaultValidate(url);

/** Slugify heading text — kept in sync with lib/sections.ts so TOC anchors match. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** GFM task lists: turn `- [ ]` / `- [x]` into disabled checkboxes. */
function taskListPlugin(mdi: MarkdownIt) {
  mdi.core.ruler.after("inline", "task-lists", (state) => {
    const tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
      if (tokens[i].type !== "inline") continue;
      if (tokens[i - 1].type !== "paragraph_open") continue;
      if (tokens[i - 2].type !== "list_item_open") continue;
      const child = tokens[i].children?.[0];
      if (!child || child.type !== "text") continue;
      const m = /^\[( |x|X)\]\s+/.exec(child.content);
      if (!m) continue;
      const checked = m[1].toLowerCase() === "x";
      child.content = child.content.slice(m[0].length);
      tokens[i - 2].attrJoin("class", "task-item");
      const box = new state.Token("html_inline", "", 0);
      box.content = `<input class="task-check" type="checkbox" disabled${checked ? " checked" : ""}> `;
      tokens[i].children!.unshift(box);
    }
    return false;
  });
}

/** Add stable ids to headings so they can be linked/anchored. */
function headingAnchorPlugin(mdi: MarkdownIt) {
  mdi.core.ruler.push("heading-anchors", (state) => {
    const seen = new Set<string>();
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "heading_open") continue;
      const inline = tokens[i + 1];
      const base = slugify(inline?.content ?? "") || "section";
      let id = base;
      let n = 1;
      while (seen.has(id)) id = `${base}-${n++}`;
      seen.add(id);
      tokens[i].attrSet("id", id);
    }
    return false;
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `![[Page]]` / `![[Page#section]]` on its own line — see lib/transclude.ts. */
const TRANSCLUDE_LINE = /^!\[\[([^[\]#|]+)(?:#([^[\]|]+))?\]\]$/;

function transclusionPlugin(mdi: MarkdownIt) {
  mdi.block.ruler.before(
    "paragraph",
    "transclusion",
    (state, startLine, _endLine, silent) => {
      // Not inside a blockquote/list continuation line we don't own.
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const line = state.src.slice(start, state.eMarks[startLine]).trim();
      const m = TRANSCLUDE_LINE.exec(line);
      if (!m) return false;
      if (silent) return true;
      const token = state.push("transclusion", "", 0);
      token.meta = { target: m[1].trim(), section: (m[2] ?? "").trim() };
      token.map = [startLine, startLine + 1];
      state.line = startLine + 1;
      return true;
    },
    { alt: ["paragraph", "blockquote", "list"] },
  );

  /** Framed placeholder used for every non-resolved state. */
  function note(label: string, message: string, kind: string): string {
    return (
      `<div class="transclusion transclusion-${kind}">` +
      `<span class="transclusion-src">${escapeHtml(label)}</span>` +
      `<p class="transclusion-note">${escapeHtml(message)}</p>` +
      `</div>`
    );
  }

  mdi.renderer.rules.transclusion = (tokens, idx, _options, env: RenderEnv) => {
    const { target, section } = tokens[idx].meta as { target: string; section: string };
    const label = section ? `${target} › ${section}` : target;
    const depth = env?.transcludeDepth ?? 0;

    // One level only: resolution happens for the host page's references, so a
    // nested include has nothing to look up and could loop.
    if (depth > 0) {
      return note(label, "Inclusion imbriquée — non développée ici.", "nested");
    }

    const res = env?.transclusions?.get(transcludeKey(target, section));
    if (!res || res.status === "loading") {
      return note(label, "Chargement du contenu inclus…", "loading");
    }
    if (res.status === "missing") {
      return note(label, `Aucune page « ${res.target} » dans cet espace.`, "error");
    }
    if (res.status === "cycle") {
      return note(label, "Une page ne peut pas s'inclure elle-même.", "error");
    }
    if (res.status === "no-section") {
      return note(
        label,
        `« ${res.pageTitle} » n'a pas de section « ${res.section} » (titre renommé ?).`,
        "error",
      );
    }

    // The body is raw source from another page, so its own `[[links]]` still
    // need resolving before it goes through the renderer.
    const body = env?.pageIndex
      ? preprocessWikilinks(res.markdown, env.pageIndex)
      : res.markdown;
    const inner = mdi.render(body, { ...env, transcludeDepth: depth + 1 });
    // Provenance, phrased as such: the included body keeps its own heading, so a
    // bare title here would read as a duplicate rather than as an attribution.
    const where =
      res.heading && res.heading !== res.pageTitle
        ? `${res.pageTitle} › ${res.heading}`
        : res.pageTitle;
    return (
      `<div class="transclusion">` +
      `<a class="transclusion-src" href="wiki:${escapeHtml(res.pageId)}"` +
      ` title="Ouvrir « ${escapeHtml(res.pageTitle)} »">` +
      `Inclus depuis ${escapeHtml(where)}</a>` +
      `<div class="transclusion-body">${inner}</div>` +
      `</div>`
    );
  };
}

md.use(taskListPlugin);
md.use(headingAnchorPlugin);
md.use(transclusionPlugin);

// Render ```mermaid fences as a container the useMermaid hook turns into a
// diagram after mount (mermaid itself is lazy-loaded, so it stays out of the
// main bundle).
const defaultFence =
  md.renderer.rules.fence ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const info = tokens[idx].info.trim().split(/\s+/)[0];
  if (info === "mermaid") {
    return `<pre class="mermaid">${escapeHtml(tokens[idx].content)}</pre>`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

// Wrap tables so wide ones scroll horizontally instead of breaking the layout.
const defaultTableOpen =
  md.renderer.rules.table_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
  return '<div class="md-table-wrap">' + defaultTableOpen(tokens, idx, options, env, self);
};
const defaultTableClose =
  md.renderer.rules.table_close ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.table_close = (tokens, idx, options, env, self) => {
  return defaultTableClose(tokens, idx, options, env, self) + "</div>";
};

export function renderMarkdown(src: string, env: RenderEnv = {}): string {
  return md.render(src, env);
}
