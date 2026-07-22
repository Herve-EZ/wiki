/**
 * Convert a Markdown document to a real .docx (OOXML) package, client-side and
 * dependency-free. We parse Markdown into markdown-it tokens and map a sensible
 * subset (headings, paragraphs, bold/italic/inline-code, links, lists,
 * blockquotes, code blocks, tables, images, horizontal rules) to
 * WordprocessingML, then zip the parts with `createZip`. Images are fetched and
 * embedded as media parts with drawing markup; anything that can't be fetched
 * falls back to its alt text.
 */
import MarkdownIt from "markdown-it";
import { createZip, type ZipFile } from "./zip";

const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

type Style = "h1" | "h2" | "h3" | "h4" | "p" | "code" | "quote";

const EMU_PER_PX = 9525;
const MAX_WIDTH_EMU = 6_000_000; // ~6.5in, fits A4 usable width

interface MediaImage {
  rId: string;
  part: string; // media/imageN.ext
  ext: string; // png | jpeg | gif
  bytes: Uint8Array;
  wEmu: number;
  hEmu: number;
  docId: number;
  alt: string;
}
type MediaMap = Map<string, MediaImage>;

interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
  color?: string;
  brBefore?: boolean;
  image?: MediaImage;
}

interface Para {
  style: Style;
  runs: Run[];
  indent?: number;
  hr?: boolean;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type MdToken = ReturnType<typeof md.parse>[number];

function inlineToRuns(inline: MdToken, media: MediaMap): Run[] {
  const runs: Run[] = [];
  let bold = 0;
  let italic = 0;
  let linkOn = false;
  let pendingBreak = false;

  const push = (text: string, code = false) => {
    runs.push({
      text,
      bold: bold > 0,
      italic: italic > 0,
      code,
      underline: linkOn,
      color: linkOn ? "0563C1" : undefined,
      brBefore: pendingBreak,
    });
    pendingBreak = false;
  };

  for (const c of inline.children ?? []) {
    switch (c.type) {
      case "text":
        if (c.content) push(c.content);
        break;
      case "strong_open":
        bold++;
        break;
      case "strong_close":
        bold--;
        break;
      case "em_open":
        italic++;
        break;
      case "em_close":
        italic--;
        break;
      case "code_inline":
        push(c.content, true);
        break;
      case "link_open":
        linkOn = true;
        break;
      case "link_close":
        linkOn = false;
        break;
      case "softbreak":
        push(" ");
        break;
      case "hardbreak":
        pendingBreak = true;
        break;
      case "image": {
        const src = c.attrGet("src") ?? "";
        const img = media.get(src);
        if (img) {
          runs.push({ text: "", image: img, brBefore: pendingBreak });
          pendingBreak = false;
        } else {
          const alt = c.content || (c.children ?? []).map((x) => x.content).join("");
          if (alt) push(alt);
        }
        break;
      }
      default:
        break;
    }
  }
  return runs;
}

type CellAlign = "" | "left" | "center" | "right";
interface TableData {
  align: CellAlign[];
  header: Run[][];
  rows: Run[][][];
}
type Block = { kind: "para"; para: Para } | { kind: "table"; table: TableData };

function tokensToBlocks(tokens: MdToken[], media: MediaMap): Block[] {
  const blocks: Block[] = [];
  const listStack: { ordered: boolean; next: number }[] = [];
  let heading = 0;
  let quote = 0;
  let pendingPrefix: string | null = null;

  // Table-collection state.
  let table: TableData | null = null;
  let inHeader = false;
  let curRow: Run[][] | null = null;

  const para = (p: Para) => blocks.push({ kind: "para", para: p });

  for (const t of tokens) {
    switch (t.type) {
      case "heading_open":
        heading = Number(t.tag.slice(1));
        break;
      case "heading_close":
        heading = 0;
        break;
      case "blockquote_open":
        quote++;
        break;
      case "blockquote_close":
        quote--;
        break;
      case "bullet_list_open":
        listStack.push({ ordered: false, next: 1 });
        break;
      case "ordered_list_open":
        listStack.push({ ordered: true, next: Number(t.attrGet("start") ?? 1) || 1 });
        break;
      case "bullet_list_close":
      case "ordered_list_close":
        listStack.pop();
        break;
      case "list_item_open": {
        const top = listStack[listStack.length - 1];
        pendingPrefix = top ? (top.ordered ? `${top.next++}. ` : "•  ") : "•  ";
        break;
      }
      case "table_open":
        table = { align: [], header: [], rows: [] };
        break;
      case "thead_open":
        inHeader = true;
        break;
      case "thead_close":
        inHeader = false;
        break;
      case "tr_open":
        curRow = [];
        break;
      case "tr_close":
        if (table && curRow) {
          if (inHeader) table.header = curRow;
          else table.rows.push(curRow);
        }
        curRow = null;
        break;
      case "th_open": {
        if (table && inHeader) {
          const m = /text-align:(left|center|right)/.exec(t.attrGet("style") ?? "");
          table.align.push((m ? m[1] : "") as CellAlign);
        }
        break;
      }
      case "table_close":
        if (table) blocks.push({ kind: "table", table });
        table = null;
        break;
      case "inline": {
        const runs = inlineToRuns(t, media);
        if (curRow) {
          curRow.push(runs);
        } else if (heading > 0) {
          para({ style: (heading <= 4 ? `h${heading}` : "h4") as Style, runs });
        } else {
          const style: Style = quote > 0 ? "quote" : "p";
          const indent = listStack.length
            ? listStack.length * 360
            : quote > 0
              ? 480
              : undefined;
          if (pendingPrefix) {
            runs.unshift({ text: pendingPrefix });
            pendingPrefix = null;
          }
          para({ style, runs, indent });
        }
        break;
      }
      case "fence":
      case "code_block": {
        const lines = t.content.replace(/\n$/, "").split("\n");
        const runs: Run[] = lines.map((ln, i) => ({ text: ln, code: true, brBefore: i > 0 }));
        para({ style: "code", runs });
        break;
      }
      case "hr":
        para({ style: "p", runs: [], hr: true });
        break;
      default:
        break;
    }
  }
  return blocks;
}

function baseFor(style: Style): Partial<Run> & { size?: number } {
  switch (style) {
    case "h1":
      return { bold: true, size: 36 };
    case "h2":
      return { bold: true, size: 30 };
    case "h3":
      return { bold: true, size: 26 };
    case "h4":
      return { bold: true, size: 24 };
    case "code":
      return { code: true, color: "333333" };
    case "quote":
      return { italic: true, color: "555555" };
    default:
      return {};
  }
}

function drawingXml(img: MediaImage): string {
  const name = esc(img.alt || `image${img.docId}`);
  return (
    "<w:r><w:drawing>" +
    '<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
    `<wp:extent cx="${img.wEmu}" cy="${img.hEmu}"/>` +
    `<wp:docPr id="${img.docId}" name="${name}"/>` +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:nvPicPr><pic:cNvPr id="${img.docId}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${img.rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/>' +
    `<a:ext cx="${img.wEmu}" cy="${img.hEmu}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"
  );
}

function runXml(r: Run, base: Partial<Run> & { size?: number }): string {
  if (r.image) return drawingXml(r.image);
  const rpr: string[] = [];
  if (r.bold || base.bold) rpr.push("<w:b/>");
  if (r.italic || base.italic) rpr.push("<w:i/>");
  if (r.underline) rpr.push('<w:u w:val="single"/>');
  const mono = r.code || base.code;
  if (mono) rpr.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>');
  const size = base.size ?? (mono ? 20 : undefined);
  if (size) rpr.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
  const color = r.color ?? base.color;
  if (color) rpr.push(`<w:color w:val="${color}"/>`);
  const rprXml = rpr.length ? `<w:rPr>${rpr.join("")}</w:rPr>` : "";
  const br = r.brBefore ? "<w:br/>" : "";
  const text = r.text ? `<w:t xml:space="preserve">${esc(r.text)}</w:t>` : "";
  return `<w:r>${rprXml}${br}${text}</w:r>`;
}

function paraXml(p: Para): string {
  if (p.hr) {
    return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>';
  }
  const ppr: string[] = [];
  if (p.indent) ppr.push(`<w:ind w:left="${p.indent}"/>`);
  switch (p.style) {
    case "h1":
      ppr.push('<w:spacing w:before="240" w:after="120"/>');
      break;
    case "h2":
      ppr.push('<w:spacing w:before="200" w:after="100"/>');
      break;
    case "h3":
      ppr.push('<w:spacing w:before="160" w:after="80"/>');
      break;
    case "code":
      ppr.push('<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>');
      break;
    default:
      ppr.push('<w:spacing w:after="120"/>');
  }
  const base = baseFor(p.style);
  const runs = p.runs.map((r) => runXml(r, base)).join("");
  const pprXml = ppr.length ? `<w:pPr>${ppr.join("")}</w:pPr>` : "";
  return `<w:p>${pprXml}${runs}</w:p>`;
}

function cellXml(runs: Run[], align: CellAlign, header: boolean): string {
  const jc = align === "center" ? '<w:jc w:val="center"/>' : align === "right" ? '<w:jc w:val="right"/>' : "";
  const base: Partial<Run> & { size?: number } = header ? { bold: true } : {};
  const body = (runs.length ? runs : [{ text: "" } as Run]).map((r) => runXml(r, base)).join("");
  const shd = header ? '<w:shd w:val="clear" w:color="auto" w:fill="F0F0F4"/>' : "";
  const tcPr = `<w:tcPr><w:tcW w:w="0" w:type="auto"/>${shd}</w:tcPr>`;
  const ppr = `<w:pPr><w:spacing w:after="0"/>${jc}</w:pPr>`;
  return `<w:tc>${tcPr}<w:p>${ppr}${body}</w:p></w:tc>`;
}

function rowXml(cells: Run[][], align: CellAlign[], header: boolean): string {
  return `<w:tr>${cells.map((c, i) => cellXml(c, align[i] ?? "", header)).join("")}</w:tr>`;
}

function tableXml(t: TableData): string {
  const sides = ["top", "left", "bottom", "right", "insideH", "insideV"];
  const borders =
    "<w:tblBorders>" +
    sides.map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>`).join("") +
    "</w:tblBorders>";
  const pr = `<w:tblPr><w:tblW w:w="0" w:type="auto"/>${borders}</w:tblPr>`;
  const head = t.header.length ? rowXml(t.header, t.align, true) : "";
  const body = t.rows.map((r) => rowXml(r, t.align, false)).join("");
  return `<w:tbl>${pr}${head}${body}</w:tbl><w:p/>`;
}

function blockXml(b: Block): string {
  return b.kind === "para" ? paraXml(b.para) : tableXml(b.table);
}

/** Fetch every embeddable image referenced by the document and measure it. */
async function collectImages(tokens: MdToken[]): Promise<MediaMap> {
  const srcs: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    if (t.type !== "inline") continue;
    for (const c of t.children ?? []) {
      if (c.type !== "image") continue;
      const src = c.attrGet("src") ?? "";
      if (src && !seen.has(src)) {
        seen.add(src);
        srcs.push(src);
      }
    }
  }

  const media: MediaMap = new Map();
  let n = 0;
  for (const src of srcs) {
    try {
      const res = await fetch(src);
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "";
      const ext = extFor(ct, src);
      if (!ext) continue; // unsupported (e.g. svg) → falls back to alt text
      const ab = await res.arrayBuffer();
      const buf = new Uint8Array(ab);
      const { w, h } = await measure(ab, ext);
      let wEmu = Math.round(w * EMU_PER_PX);
      let hEmu = Math.round(h * EMU_PER_PX);
      if (wEmu > MAX_WIDTH_EMU) {
        hEmu = Math.round((hEmu * MAX_WIDTH_EMU) / wEmu);
        wEmu = MAX_WIDTH_EMU;
      }
      n++;
      media.set(src, {
        rId: `rId${n}`,
        part: `media/image${n}.${ext}`,
        ext,
        bytes: buf,
        wEmu,
        hEmu,
        docId: n,
        alt: "",
      });
    } catch {
      // Unreachable/blocked image → leave it out; alt text is used instead.
    }
  }
  return media;
}

function extFor(contentType: string, url: string): string | null {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpeg";
  if (ct.includes("gif")) return "gif";
  const m = /\.(png|jpe?g|gif)(?:$|\?)/i.exec(url);
  if (m) {
    const e = m[1].toLowerCase();
    return e === "jpg" ? "jpeg" : e;
  }
  return null;
}

async function measure(ab: ArrayBuffer, ext: string): Promise<{ w: number; h: number }> {
  try {
    const blob = new Blob([ab], { type: `image/${ext}` });
    const bmp = await createImageBitmap(blob);
    const dims = { w: bmp.width, h: bmp.height };
    bmp.close?.();
    return dims;
  } catch {
    return { w: 480, h: 360 };
  }
}

const CONTENT_TYPE_HEADER =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>';

const RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  "</Relationships>";

/** Build a .docx package (as bytes) from a Markdown string. */
export async function markdownToDocx(markdown: string): Promise<Uint8Array> {
  const tokens = md.parse(markdown, {});
  const media = await collectImages(tokens);
  const blocks = tokensToBlocks(tokens, media);
  const body = blocks.map(blockXml).join("");

  const images = [...media.values()];
  const usedExts = new Set(images.map((i) => i.ext));
  const contentTypes =
    CONTENT_TYPE_HEADER +
    [...usedExts]
      .map((e) => `<Default Extension="${e}" ContentType="image/${e}"/>`)
      .join("") +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    "</Types>";

  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<w:body>${body}` +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>' +
    "</w:sectPr></w:body></w:document>";

  const parts: ZipFile[] = [
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: RELS },
    { name: "word/document.xml", content: document },
  ];

  if (images.length) {
    const docRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      images
        .map(
          (i) =>
            `<Relationship Id="${i.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${i.part}"/>`,
        )
        .join("") +
      "</Relationships>";
    parts.push({ name: "word/_rels/document.xml.rels", content: docRels });
    for (const i of images) parts.push({ name: `word/${i.part}`, content: i.bytes });
  }

  return createZip(parts);
}
