import { useOutletContext } from "react-router-dom";
import type { PageListItem, Workspace } from "../lib/types";

export interface WorkspaceCtx {
  workspaces: Workspace[];
  current: Workspace | undefined;
  pages: PageListItem[];
  updatedPageIds: Set<string>;
  markUpdated: (id: string) => void;
  openSearch: () => void;
  refetchPages: () => void;
}

export function useWorkspaceCtx(): WorkspaceCtx {
  return useOutletContext<WorkspaceCtx>();
}
