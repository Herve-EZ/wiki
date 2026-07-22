/**
 * Build a parent/child tree from the flat page list. A page whose parent is
 * missing (trashed, or absent from the local cache offline) is treated as a
 * root, so the sidebar never hides a page.
 */
import type { PageListItem } from "./types";

export interface PageNode {
  page: PageListItem;
  children: PageNode[];
  depth: number;
}

export function buildPageTree(pages: PageListItem[]): PageNode[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const nodes = new Map<string, PageNode>(
    pages.map((p) => [p.id, { page: p, children: [], depth: 0 }]),
  );
  const roots: PageNode[] = [];
  for (const p of pages) {
    const node = nodes.get(p.id)!;
    const parentId = p.parent && byId.has(p.parent) ? p.parent : null;
    if (parentId) nodes.get(parentId)!.children.push(node);
    else roots.push(node);
  }
  const sortRec = (list: PageNode[], depth: number) => {
    list.sort((a, b) => a.page.title.localeCompare(b.page.title));
    for (const n of list) {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    }
  };
  sortRec(roots, 0);
  return roots;
}

/** Depth-first list of the nodes that are currently visible (collapsed subtrees
 * are skipped). */
export function flattenVisible(
  roots: PageNode[],
  collapsed: Set<string>,
): PageNode[] {
  const out: PageNode[] = [];
  const walk = (n: PageNode) => {
    out.push(n);
    if (!collapsed.has(n.page.id)) n.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

/** Ids that would form a cycle if chosen as a page's parent (itself + all its
 * descendants). Used to filter the "move under…" picker. */
export function descendantIds(pages: PageListItem[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const p of pages) {
    if (p.parent) {
      const list = childrenOf.get(p.parent) ?? [];
      list.push(p.id);
      childrenOf.set(p.parent, list);
    }
  }
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of childrenOf.get(id) ?? []) {
      if (!out.has(child)) {
        out.add(child);
        stack.push(child);
      }
    }
  }
  return out;
}
