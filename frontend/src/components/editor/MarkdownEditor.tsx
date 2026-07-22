import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { PagePicker } from "./PagePicker";
import { MentionPicker } from "./MentionPicker";
import { TableEditor } from "./TableEditor";
import {
  type EditResult,
  insertBlock,
  insertInline,
  toggleLinePrefix,
  wrapInline,
} from "../../lib/editorActions";
import { parseTableAt } from "../../lib/tables";
import type { PageRef } from "../../lib/wikilinks";
import type { Member } from "../../lib/types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  pages: PageRef[];
  currentPageId: string;
  members: Member[];
  autoFocus?: boolean;
}

type SlashState = { query: string; slashPos: number } | null;

interface Command {
  key: string;
  label: string;
  icon: string;
  /** Pure transform for direct-insert commands. */
  run?: (text: string, start: number, end: number) => EditResult;
  /** Popover commands set a mode instead of transforming inline. */
  opens?: "link" | "mention" | "table";
}

const CODE_BLOCK = "```\n\n```";
const MERMAID_BLOCK = "```mermaid\nflowchart LR\n  A[Début] --> B[Fin]\n```";

const COMMANDS: Command[] = [
  { key: "h2", label: "Titre", icon: "heading", run: (t, s, e) => toggleLinePrefix(t, s, e, "## ") },
  { key: "h3", label: "Sous-titre", icon: "heading", run: (t, s, e) => toggleLinePrefix(t, s, e, "### ") },
  { key: "ul", label: "Liste à puces", icon: "list", run: (t, s, e) => toggleLinePrefix(t, s, e, "- ") },
  { key: "task", label: "Liste de tâches", icon: "checkSquare", run: (t, s, e) => toggleLinePrefix(t, s, e, "- [ ] ") },
  { key: "quote", label: "Citation", icon: "quote", run: (t, s, e) => toggleLinePrefix(t, s, e, "> ") },
  { key: "code", label: "Bloc de code", icon: "code", run: (t, s, e) => insertBlock(t, s, e, CODE_BLOCK) },
  { key: "table", label: "Tableau", icon: "table", opens: "table" },
  { key: "diagram", label: "Diagramme (Mermaid)", icon: "diagram", run: (t, s, e) => insertBlock(t, s, e, MERMAID_BLOCK) },
  { key: "link", label: "Lien vers une page", icon: "link", opens: "link" },
  { key: "mention", label: "Mention", icon: "at", opens: "mention" },
];

/** Markdown editing surface: a formatting toolbar, a "/" command menu, and
 * popovers for wiki links, @-mentions and the visual table editor — all driving
 * one plain <textarea>. */
export function MarkdownEditor({
  value,
  onChange,
  pages,
  currentPageId,
  members,
  autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableInitial, setTableInitial] = useState<ReturnType<typeof parseTableAt> | null>(null);
  const [slash, setSlash] = useState<SlashState>(null);

  function focusAt(res: EditResult) {
    onChange(res.text);
    requestAnimationFrame(() => {
      const ta = ref.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(res.selStart, res.selEnd);
    });
  }

  function apply(fn: (t: string, s: number, e: number) => EditResult) {
    const ta = ref.current;
    if (!ta) return;
    focusAt(fn(value, ta.selectionStart, ta.selectionEnd));
  }

  function wrap(before: string, after?: string) {
    apply((t, s, e) => wrapInline(t, s, e, before, after));
  }

  // ---- Wiki link ----
  function insertLink(page: PageRef) {
    const ta = ref.current;
    const start = ta ? ta.selectionStart : value.length;
    const end = ta ? ta.selectionEnd : value.length;
    const selected = value.slice(start, end);
    const token = selected ? `[[${page.slug}|${selected}]]` : `[[${page.title}]]`;
    focusAt(insertInline(value, start, end, token));
    setLinkOpen(false);
  }

  // ---- Mention ----
  function insertMention(m: Member) {
    const ta = ref.current;
    const pos = ta ? ta.selectionStart : value.length;
    focusAt(insertInline(value, pos, pos, `@${m.display_name || m.email} `));
    setMentionOpen(false);
  }

  // ---- Table ----
  function openTable() {
    const ta = ref.current;
    const caret = ta ? ta.selectionStart : 0;
    // Prefill if the caret sits inside an existing table.
    const found = parseTableAt(value);
    setTableInitial(found && caret >= found.start && caret <= found.end ? found : null);
    setTableOpen(true);
  }
  function insertTable(markdown: string) {
    const ta = ref.current;
    const start = ta ? ta.selectionStart : value.length;
    const end = ta ? ta.selectionEnd : value.length;
    if (tableInitial) {
      // Replace the existing table block.
      const next = value.slice(0, tableInitial.start) + markdown + value.slice(tableInitial.end);
      focusAt({ text: next, selStart: tableInitial.start + markdown.length, selEnd: tableInitial.start + markdown.length });
    } else {
      focusAt(insertBlock(value, start, end, markdown));
    }
    setTableOpen(false);
    setTableInitial(null);
  }

  function runCommand(cmd: Command) {
    if (cmd.opens === "link") setLinkOpen(true);
    else if (cmd.opens === "mention") setMentionOpen(true);
    else if (cmd.opens === "table") openTable();
    else if (cmd.run) apply(cmd.run);
  }

  // ---- Slash menu ----
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    onChange(v);
    const caret = e.target.selectionStart;
    const lineStart = v.lastIndexOf("\n", caret - 1) + 1;
    const line = v.slice(lineStart, caret);
    const m = /^\s*\/(\w*)$/.exec(line);
    if (m) setSlash({ query: m[1].toLowerCase(), slashPos: lineStart + line.indexOf("/") });
    else setSlash(null);
  }

  function runSlash(cmd: Command) {
    const ta = ref.current;
    if (!ta || !slash) return;
    const caret = ta.selectionStart;
    // Strip the "/query" text first.
    const cleaned = value.slice(0, slash.slashPos) + value.slice(caret);
    setSlash(null);
    if (cmd.opens) {
      onChange(cleaned);
      requestAnimationFrame(() => {
        const t = ref.current;
        t?.focus();
        t?.setSelectionRange(slash.slashPos, slash.slashPos);
        runCommand(cmd);
      });
    } else if (cmd.run) {
      focusAt(cmd.run(cleaned, slash.slashPos, slash.slashPos));
    }
  }

  const slashMatches = slash
    ? COMMANDS.filter((c) => !slash.query || c.label.toLowerCase().includes(slash.query))
    : [];

  const toolbar: { title: string; icon: string; act: () => void }[] = [
    { title: "Gras", icon: "bold", act: () => wrap("**") },
    { title: "Italique", icon: "italic", act: () => wrap("*") },
    { title: "Barré", icon: "strike", act: () => wrap("~~") },
    { title: "Titre", icon: "heading", act: () => apply((t, s, e) => toggleLinePrefix(t, s, e, "## ")) },
    { title: "Liste à puces", icon: "list", act: () => apply((t, s, e) => toggleLinePrefix(t, s, e, "- ")) },
    { title: "Liste de tâches", icon: "checkSquare", act: () => apply((t, s, e) => toggleLinePrefix(t, s, e, "- [ ] ")) },
    { title: "Citation", icon: "quote", act: () => apply((t, s, e) => toggleLinePrefix(t, s, e, "> ")) },
    { title: "Code en ligne", icon: "code", act: () => wrap("`") },
    { title: "Tableau", icon: "table", act: openTable },
    { title: "Diagramme (Mermaid)", icon: "diagram", act: () => apply((t, s, e) => insertBlock(t, s, e, MERMAID_BLOCK)) },
    { title: "Insérer un lien vers une page", icon: "link", act: () => setLinkOpen(true) },
    { title: "Mentionner un membre", icon: "at", act: () => setMentionOpen(true) },
  ];

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        {toolbar.map((b) => (
          <button
            key={b.title}
            type="button"
            className="md-tool"
            title={b.title}
            aria-label={b.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.act}
          >
            <Icon name={b.icon} size={15} />
          </button>
        ))}
      </div>

      <div className="md-editor-body">
        <textarea
          ref={ref}
          className="sec-textarea"
          value={value}
          autoFocus={autoFocus}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (slash && e.key === "Escape") {
              e.preventDefault();
              setSlash(null);
            }
          }}
          placeholder="Rédigez en Markdown… Tapez « / » pour insérer un élément."
        />

        {slash && slashMatches.length > 0 && (
          <div className="slash-menu">
            <div className="slash-hint">Insérer…</div>
            {slashMatches.map((c) => (
              <button key={c.key} type="button" className="slash-item" onClick={() => runSlash(c)}>
                <Icon name={c.icon} size={14} />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {linkOpen && (
          <div className="editor-popover">
            <PagePicker
              pages={pages}
              excludeId={currentPageId}
              onPick={insertLink}
              onClose={() => setLinkOpen(false)}
            />
          </div>
        )}
        {mentionOpen && (
          <div className="editor-popover">
            <MentionPicker members={members} onPick={insertMention} onClose={() => setMentionOpen(false)} />
          </div>
        )}
      </div>

      {tableOpen && (
        <TableEditor
          initial={tableInitial?.model}
          onInsert={insertTable}
          onClose={() => {
            setTableOpen(false);
            setTableInitial(null);
          }}
        />
      )}
    </div>
  );
}
