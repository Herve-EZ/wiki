/**
 * Export a page to PDF using the browser/webview print pipeline (works offline,
 * zero dependencies). The rendered Markdown is written into a hidden iframe with
 * a print stylesheet, then `print()` opens the native dialog where the user
 * picks "Save as PDF".
 */
import { renderMarkdown } from "../markdown";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PRINT_CSS = `
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1b1830; line-height: 1.65; font-size: 12pt; margin: 0;
  }
  .doc { max-width: 800px; margin: 0 auto; }
  h1 { font-size: 22pt; margin: 0 0 12px; letter-spacing: -0.01em; }
  h2 { font-size: 16pt; margin: 22px 0 8px; }
  h3 { font-size: 13pt; margin: 18px 0 6px; }
  p { margin: 0 0 10px; }
  a { color: #0563c1; text-decoration: underline; }
  ul, ol { padding-left: 22px; margin: 0 0 10px; }
  li { margin-bottom: 4px; }
  code { font-family: "Consolas", monospace; font-size: 10.5pt; background: #f2f1f7;
         padding: 1px 4px; border-radius: 3px; }
  pre { background: #f5f4fa; border: 1px solid #e6e4ee; border-radius: 6px;
        padding: 12px; overflow: auto; white-space: pre-wrap; word-break: break-word; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 0 0 10px; padding: 4px 14px; border-left: 3px solid #cfcadf;
               color: #555; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 12px; }
  th, td { border: 1px solid #d9d6e6; padding: 6px 9px; text-align: left; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #d9d6e6; margin: 18px 0; }
`;

export function exportPdf(title: string, markdown: string): void {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head>
<body><main class="doc">${renderMarkdown(markdown)}</main></body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    // Delay removal so the print dialog isn't torn down mid-render.
    setTimeout(() => iframe.remove(), 1000);
  };
  win.onafterprint = cleanup;

  // Give the layout a beat before printing.
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      // Fallback cleanup if onafterprint never fires (some webviews).
      setTimeout(cleanup, 60_000);
    }
  }, 300);
}
