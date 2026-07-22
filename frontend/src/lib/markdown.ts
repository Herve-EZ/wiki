import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

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

md.use(taskListPlugin);
md.use(headingAnchorPlugin);

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

export function renderMarkdown(src: string): string {
  return md.render(src);
}
