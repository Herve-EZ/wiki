import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { loadPage } from "../lib/pageStore";
import { isOnline } from "../lib/network";
import {
  extractSection,
  parseTranscludeRefs,
  type TranscludeMap,
} from "../lib/transclude";
import type { PageRef } from "../lib/wikilinks";

/**
 * Resolve every `![[Page#section]]` reference in `content` into the markdown it
 * should render (see lib/transclude.ts).
 *
 * Targets are fetched through `loadPage` under the same `["page", id]` query key
 * PageRoute uses, so an already-visited page comes straight from the cache — and
 * the local mirror keeps includes working offline on the desktop app.
 */
export function useTransclusions(
  content: string,
  pageIndex: Map<string, PageRef>,
  currentPageId: string,
): TranscludeMap {
  const refs = useMemo(() => parseTranscludeRefs(content), [content]);

  const resolved = useMemo(
    () => refs.map((ref) => ({ ref, page: pageIndex.get(ref.target.toLowerCase()) })),
    [refs, pageIndex],
  );

  // One fetch per distinct target page, however many sections it provides.
  const ids = useMemo(() => {
    const set = new Set<string>();
    for (const { page } of resolved) {
      if (page && page.id !== currentPageId) set.add(page.id);
    }
    return [...set];
  }, [resolved, currentPageId]);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["page", id],
      queryFn: () => loadPage(id, isOnline()),
    })),
  });

  return useMemo(() => {
    const bodies = new Map<string, string>();
    ids.forEach((id, i) => {
      const data = queries[i]?.data;
      if (data) bodies.set(id, data.content_md);
    });

    const map: TranscludeMap = new Map();
    for (const { ref, page } of resolved) {
      if (!page) {
        map.set(ref.key, { status: "missing", target: ref.target });
        continue;
      }
      if (page.id === currentPageId) {
        map.set(ref.key, { status: "cycle" });
        continue;
      }
      const body = bodies.get(page.id);
      if (body == null) {
        map.set(ref.key, { status: "loading" });
        continue;
      }
      if (!ref.section) {
        map.set(ref.key, {
          status: "ok",
          pageId: page.id,
          pageTitle: page.title,
          heading: page.title,
          markdown: body,
        });
        continue;
      }
      const section = extractSection(body, ref.section);
      if (!section) {
        map.set(ref.key, {
          status: "no-section",
          pageId: page.id,
          pageTitle: page.title,
          section: ref.section,
        });
        continue;
      }
      map.set(ref.key, {
        status: "ok",
        pageId: page.id,
        pageTitle: page.title,
        heading: section.headingText || page.title,
        markdown: section.text,
      });
    }
    return map;
  }, [ids, queries, resolved, currentPageId]);
}
