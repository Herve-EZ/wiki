export type PageStatus = "draft" | "published" | "archived";
export type Role = "owner" | "editor" | "viewer";
export type WorkspacePermission = "public" | "private" | "invite";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  mfa_enabled: boolean;
  /** Platform-wide administrator (white-label config, SSO setup, admin roster). */
  is_system_admin: boolean;
}

/** An SSO provider that is enabled AND configured server-side (safe to render). */
export interface SsoProvider {
  id: string;
  label: string;
}

/** Public, anonymously-readable branding + usable auth methods (login page). */
export interface SiteConfig {
  site_name: string;
  tagline: string;
  logo_svg: string;
  primary_color: string;
  primary_color_dark: string;
  support_email: string;
  login_title: string;
  login_subtitle: string;
  allow_registration: boolean;
  enable_email_login: boolean;
  sso_providers: SsoProvider[];
}

/** Per-provider status in the admin screen: admin intent + server-side config. */
export interface AdminProviderStatus {
  id: string;
  label: string;
  enabled: boolean;
  configured: boolean;
}

/** Full, writable platform config (system admin only). */
export interface AdminSiteConfig {
  site_name: string;
  tagline: string;
  logo_svg: string;
  primary_color: string;
  primary_color_dark: string;
  support_email: string;
  login_title: string;
  login_subtitle: string;
  allow_registration: boolean;
  enable_email_login: boolean;
  enable_google: boolean;
  enable_github: boolean;
  enable_microsoft: boolean;
  enable_saml: boolean;
  providers: AdminProviderStatus[];
  updated_at: string;
  // SMTP
  email_enabled: boolean;
  email_host: string;
  email_port: number;
  email_host_user: string;
  email_host_password?: string;
  email_password_set: boolean;
  email_use_tls: boolean;
  email_use_ssl: boolean;
  email_from: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  is_superuser: boolean;
  is_system_admin: boolean;
  is_effective_admin: boolean;
  date_joined: string;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  permission: WorkspacePermission;
  require_mfa: boolean;
  created_at: string;
  /** The caller's role in this workspace (null if not a member — e.g. public). */
  my_role: Role | null;
}

export interface Member {
  id: string;
  user: string;
  email: string;
  display_name: string;
  role: Role;
}

/** Owner-facing view of a workspace invitation. */
export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: Role;
  status: "pending" | "accepted" | "declined" | "revoked";
  invited_by_email: string | null;
  created_at: string;
  expires_at: string;
}

/** Invitee-facing view (pending list + invite-link landing). */
export interface MyInvitation {
  id: string;
  token: string;
  email: string;
  role: Role;
  status: "pending" | "accepted" | "declined" | "revoked";
  workspace_name: string;
  workspace_slug: string;
  invited_by_email: string | null;
  invited_by_name: string | null;
  created_at: string;
  expires_at: string;
  is_expired?: boolean;
}

export interface WorkflowStage {
  id?: string;
  name: string;
  order: number;
  is_final: boolean;
}

export interface Workflow {
  id: string;
  workspace: string;
  name: string;
  description: string;
  is_active: boolean;
  stages: WorkflowStage[];
  created_at?: string;
}

export interface PageWorkflow {
  id: string;
  workflow: string;
  workflow_name: string;
  current_stage: string | null;
  current_stage_name: string | null;
  stages: WorkflowStage[];
}

export interface Page {
  id: string;
  workspace: string;
  /** Parent page id for the hierarchy, or null at the root. */
  parent?: string | null;
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
  parent?: string | null;
  title: string;
  slug: string;
  status: PageStatus;
  updated_at: string;
}

export interface SearchResult {
  id: string;
  workspace: string;
  title: string;
  slug: string;
  status: PageStatus;
  updated_at: string;
  snippet: string;
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

export type NotificationType = "invitation" | "mention" | "page_updated" | "workflow_stage";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, string>;
  actor_display_name: string;
  actor_email: string;
  read_at: string | null;
  created_at: string;
}

/** Login step 1 result: either the JWT pair, or an MFA challenge. */
export type LoginResult =
  | { kind: "tokens" }
  | { kind: "mfa"; challengeToken: string };
