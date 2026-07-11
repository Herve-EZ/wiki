/**
 * Local SQLite mirror (desktop only). Backs the degraded/offline mode: pages
 * the user has opened are cached here, and edits made while the server is
 * unreachable are appended to the outbox for later replay.
 *
 * On web this module is inert — callers gate on `isTauri()` before using it,
 * and `getDb()` throws if that contract is violated (surfaces bugs early).
 */
import type { CachedPage, OutboxEntry, Page } from "./types";
import { isTauri } from "./platform";

type SqlDatabase = {
  execute(query: string, values?: unknown[]): Promise<{ rowsAffected: number; lastInsertId?: number }>;
  select<T>(query: string, values?: unknown[]): Promise<T>;
};

let dbPromise: Promise<SqlDatabase> | null = null;

async function getDb(): Promise<SqlDatabase> {
  if (!isTauri()) {
    throw new Error("Local database is only available in the desktop app");
  }
  if (!dbPromise) {
    dbPromise = import("@tauri-apps/plugin-sql").then((m) =>
      m.default.load("sqlite:wikicollab.db"),
    ) as unknown as Promise<SqlDatabase>;
  }
  return dbPromise;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Upsert a page into the mirror from a server payload (clean, not dirty). */
export async function cachePageFromServer(page: Page): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO page_cache
       (id, workspace, title, slug, content_md, status, base_version, server_updated, local_updated, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       workspace=excluded.workspace, title=excluded.title, slug=excluded.slug,
       content_md=excluded.content_md, status=excluded.status,
       base_version=excluded.base_version, server_updated=excluded.server_updated,
       local_updated=excluded.local_updated, dirty=0`,
    [
      page.id, page.workspace, page.title, page.slug, page.content_md,
      page.status, null, page.updated_at ?? null, nowIso(),
    ],
  );
}

export async function getCachedPage(id: string): Promise<CachedPage | null> {
  const db = await getDb();
  const rows = await db.select<CachedPage[]>(
    `SELECT id, workspace, title, slug, content_md, status,
            base_version, local_updated, dirty FROM page_cache WHERE id = ?`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listCachedPages(workspace: string): Promise<CachedPage[]> {
  const db = await getDb();
  return db.select<CachedPage[]>(
    `SELECT id, workspace, title, slug, content_md, status,
            base_version, local_updated, dirty
       FROM page_cache WHERE workspace = ? ORDER BY title`,
    [workspace],
  );
}

/** Record a local edit: mark the mirror dirty AND enqueue an outbox mutation. */
export async function recordLocalEdit(
  page: CachedPage,
  patch: Partial<Pick<Page, "title" | "content_md" | "status">>,
): Promise<void> {
  const db = await getDb();
  const merged = { ...page, ...patch };
  await db.execute(
    `UPDATE page_cache SET title=?, content_md=?, status=?, local_updated=?, dirty=1 WHERE id=?`,
    [merged.title, merged.content_md, merged.status, nowIso(), page.id],
  );
  await db.execute(
    `INSERT INTO outbox (page_id, kind, payload, base_version, created_at, attempts)
     VALUES (?, 'update', ?, ?, ?, 0)`,
    [page.id, JSON.stringify(patch), page.base_version, nowIso()],
  );
}

export async function pendingOutbox(): Promise<OutboxEntry[]> {
  const db = await getDb();
  return db.select<OutboxEntry[]>(
    `SELECT seq, page_id, kind, payload, base_version, created_at, attempts, last_error
       FROM outbox ORDER BY seq ASC`,
  );
}

export async function outboxCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(`SELECT COUNT(*) AS n FROM outbox`);
  return rows[0]?.n ?? 0;
}

export async function dropOutboxEntry(seq: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM outbox WHERE seq = ?`, [seq]);
}

export async function markOutboxError(seq: number, error: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE seq = ?`,
    [error, seq],
  );
}

export async function clearDirty(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE page_cache SET dirty = 0 WHERE id = ?`, [id]);
}

/** Remove a page from the mirror entirely, dropping any queued edits for it.
 * Used when the page no longer exists on the server and the user chooses to
 * forget it locally. */
export async function evictPage(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM outbox WHERE page_id = ?`, [id]);
  await db.execute(`DELETE FROM page_cache WHERE id = ?`, [id]);
}

/** An outbox entry that failed to push (conflict or missing page), joined with
 * the cached page so the resolution UI can show a title and offer "recreate". */
export interface ConflictEntry {
  seq: number;
  page_id: string;
  last_error: string;
  title: string | null;
  workspace: string | null;
  content_md: string | null;
  status: string | null;
}

export async function listConflicts(): Promise<ConflictEntry[]> {
  const db = await getDb();
  return db.select<ConflictEntry[]>(
    `SELECT o.seq, o.page_id, o.last_error,
            c.title, c.workspace, c.content_md, c.status
       FROM outbox o
       LEFT JOIN page_cache c ON c.id = o.page_id
      WHERE o.last_error IS NOT NULL
      ORDER BY o.seq ASC`,
  );
}

export async function conflictCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM outbox WHERE last_error IS NOT NULL`,
  );
  return rows[0]?.n ?? 0;
}
