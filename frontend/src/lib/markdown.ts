import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

// Allow our internal `wiki:` scheme (page links) through the link validator.
const defaultValidate = md.validateLink.bind(md);
md.validateLink = (url: string) => url.startsWith("wiki:") || defaultValidate(url);

export function renderMarkdown(src: string): string {
  return md.render(src);
}
