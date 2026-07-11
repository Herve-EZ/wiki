import { useOutletContext } from "react-router-dom";
import type { PageListItem, Role, Workspace } from "../lib/types";

export interface WorkspaceCtx {
  workspaces: Workspace[];
  current: Workspace | undefined;
  /** The caller's role in the current workspace, for UI gating. */
  role: Role | null;
  canWrite: boolean;
  isOwner: boolean;
  pages: PageListItem[];
  updatedPageIds: Set<string>;
  markUpdated: (id: string) => void;
  openSearch: () => void;
  refetchPages: () => void;
}

export function useWorkspaceCtx(): WorkspaceCtx {
  return useOutletContext<WorkspaceCtx>();
}
