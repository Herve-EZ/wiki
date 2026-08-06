import { Icon } from "./Icon";
import { TableOfContents } from "./editor/TableOfContents";
import { timeAgo } from "../lib/dates";
import type { Section } from "../lib/sections";
import type { Page, PageListItem, PageStatus } from "../lib/types";

const STATUS_LABEL: Record<PageStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

interface Props {
  page: Page;
  sections: Section[];
  backlinks: PageListItem[];
  onOpenPage: (id: string) => void;
}

/**
 * Everything that describes the page without being the page: where you are in
 * it, what state it is in, and what points at it. Sticky, so the table of
 * contents stops scrolling away — the reason it left the document flow.
 *
 * The "Détails" block is where F24 (page owner + last verification date) will
 * land without any further layout work.
 */
export function ContextRail({ page, sections, backlinks, onOpenPage }: Props) {
  return (
    <aside className="ctx-rail" aria-label="Contexte de la page">
      <TableOfContents sections={sections} variant="rail" />

      <div className="rail-block">
        <p className="rail-title">Détails</p>
        <dl className="rail-meta">
          <dt>Statut</dt>
          <dd>
            <span className={`rail-status ${page.status}`}>{STATUS_LABEL[page.status]}</span>
          </dd>

          {page.author_email && (
            <>
              <dt>Auteur</dt>
              <dd className="rail-ellipsis" title={page.author_email}>
                {page.author_email}
              </dd>
            </>
          )}

          {page.updated_at && (
            <>
              <dt>Modifiée</dt>
              <dd>
                <time dateTime={page.updated_at}>{timeAgo(page.updated_at)}</time>
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className="rail-block">
        <p className="rail-title">Lié à</p>
        {backlinks.length === 0 ? (
          <p className="rail-empty">Aucune page ne pointe vers celle-ci.</p>
        ) : (
          <ul className="rail-links">
            {backlinks.map((p) => (
              <li key={p.id}>
                <button className="rail-link" onClick={() => onOpenPage(p.id)}>
                  <Icon name="link" size="xs" />
                  <span className="rail-ellipsis">{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
