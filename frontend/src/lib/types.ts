export type PageStatus = "draft" | "published" | "archived";
export type Role = "owner" | "editor" | "viewer";
export type WorkspacePermission = "public" | "private" | "invite";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  mfa_enabled: boolean;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  permission: WorkspacePermission;
  require_mfa: boolean;
  created_at: string;
}

export interface Page {
  id: string;
  workspace: string;
  title: string;
  slug: string;
  content_md: string;
  status: PageStatus;
  author_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PageListItem {
  id: string;
  workspace: string;
  title: string;
  slug: string;
  status: PageStatus;
  updated_at: string;
}

export interface PageVersion {
  id: string;
  version_number: number;
  title: string;
  author_email?: string;
  created_at: string;
}

export interface PageVersionDetail extends PageVersion {
  content_md: string;
}

export interface DiffOp {
  op: "equal" | "replace" | "delete" | "insert";
  from_lines: string[];
  to_lines: string[];
  from_start: number;
  to_start: number;
}

export interface DiffResult {
  from: number;
  to: number;
  ops: DiffOp[];
  unified: string;
}

/** A page as held in the local mirror, with sync bookkeeping. */
export interface CachedPage extends Page {
  base_version: number | null;
  local_updated: string;
  dirty: boolean;
}

export interface OutboxEntry {
  seq: number;
  page_id: string;
  kind: "create" | "update";
  payload: string;
  base_version: number | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

/** Login step 1 result: either the JWT pair, or an MFA challenge. */
export type LoginResult =
  | { kind: "tokens" }
  | { kind: "mfa"; challengeToken: string };
