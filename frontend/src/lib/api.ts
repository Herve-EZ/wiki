/**
 * REST client for the Django backend. Attaches the JWT access token, refreshes
 * once on a 401, and distinguishes "server said no" (ApiError) from "couldn't
 * reach the server" (NetworkError) so the offline layer can react correctly.
 */
import { clearTokens, loadTokens, saveTokens } from "./auth";
import { isForcedOffline, reportBackendReachable } from "./network";
import type {
  AdminSiteConfig,
  AdminUser,
  AppNotification,
  DiffResult,
  LoginResult,
  Member,
  MyInvitation,
  Page,
  PageListItem,
  PageVersion,
  PageVersionDetail,
  PageWorkflow,
  Role,
  SearchResult,
  SiteConfig,
  User,
  Workflow,
  WorkflowStage,
  Workspace,
  WorkspaceInvitation,
  WorkspacePermission,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Network unreachable");
    this.name = "NetworkError";
  }
}

async function refreshAccess(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens?.refresh) return null;
  const res = await fetch(`${API_URL}/api/auth/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!res.ok) {
    await clearTokens();
    return null;
  }
  const data = (await res.json()) as { access: string; refresh?: string };
  await saveTokens({ access: data.access, refresh: data.refresh ?? tokens.refresh });
  return data.access;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  // "Work offline" mode: never touch the network — let the offline layer
  // (mirror reads, outbox queueing) take over via NetworkError.
  if (isForcedOffline()) throw new NetworkError();
  const tokens = await loadTokens();
  const headers = new Headers(init.headers);
  // For FormData, let the browser set the multipart Content-Type (with its
  // boundary); forcing application/json would corrupt file uploads.
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (tokens?.access) headers.set("Authorization", `Bearer ${tokens.access}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    reportBackendReachable(false);
    throw new NetworkError();
  }
  reportBackendReachable(true);

  if (res.status === 401 && retry) {
    const access = await refreshAccess();
    if (access) return request<T>(path, init, false);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Pre-auth POST that never attaches a token or triggers a refresh. */
async function publicPost<T>(path: string, body: unknown): Promise<T> {
  if (isForcedOffline()) throw new NetworkError();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || res.statusText);
  }
  return (await res.json()) as T;
}

/** Pre-auth GET that never attaches a token (branding/config on the login page). */
async function publicGet<T>(path: string): Promise<T> {
  if (isForcedOffline()) throw new NetworkError();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || res.statusText);
  }
  return (await res.json()) as T;
}

interface TokenPair {
  access: string;
  refresh: string;
}
type LoginResponse = TokenPair | { mfa_required: true; challenge_token: string };

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** DRF list endpoints paginate (`{count, results}`); custom actions return a
 * bare array. Accept either shape so callers always get a plain list. */
function asList<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

async function requestList<T>(path: string): Promise<T[]> {
  return asList(await request<T[] | Paginated<T>>(path));
}

export const api = {
  // ---- platform config / branding ----
  getConfig: () => publicGet<SiteConfig>("/api/config"),
  getAdminConfig: () => request<AdminSiteConfig>("/api/admin/config"),
  updateAdminConfig: (patch: Partial<AdminSiteConfig>) =>
    request<AdminSiteConfig>("/api/admin/config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  testEmail: () =>
    request<{ detail: string }>("/api/admin/config/test-email", {
      method: "POST",
      body: "{}",
    }),
  listAdminUsers: () => request<AdminUser[]>("/api/admin/users"),
  setUserSystemAdmin: (id: string, isSystemAdmin: boolean) =>
    request<AdminUser>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_system_admin: isSystemAdmin }),
    }),

  // ---- auth ----
  async login(email: string, password: string): Promise<LoginResult> {
    const data = await publicPost<LoginResponse>("/api/auth/token", { email, password });
    if ("mfa_required" in data) {
      return { kind: "mfa", challengeToken: data.challenge_token };
    }
    await saveTokens({ access: data.access, refresh: data.refresh });
    return { kind: "tokens" };
  },
  /** Exchange the one-time SSO code (from the wikicollab:// deep link) for the
   * JWT pair, or surface an MFA challenge — same shape as password login. */
  async ssoExchange(code: string): Promise<LoginResult> {
    const data = await publicPost<LoginResponse>("/api/auth/sso/exchange", { code });
    if ("mfa_required" in data) {
      return { kind: "mfa", challengeToken: data.challenge_token };
    }
    await saveTokens({ access: data.access, refresh: data.refresh });
    return { kind: "tokens" };
  },
  async verifyMfa(challengeToken: string, code: string): Promise<void> {
    const data = await publicPost<TokenPair>("/api/auth/mfa/verify", {
      challenge_token: challengeToken,
      code,
    });
    await saveTokens({ access: data.access, refresh: data.refresh });
  },
  register: (body: { email: string; password: string; display_name?: string }) =>
    publicPost<User>("/api/auth/register", body),
  me: () => request<User>("/api/auth/me"),

  // ---- account / settings ----
  updateProfile: (patch: { display_name?: string }) =>
    request<User>("/api/auth/me", { method: "PATCH", body: JSON.stringify(patch) }),
  /** Upload a new profile photo (multipart). The file is stored in S3 and the
   * refreshed user (with its public `avatar_url`) is returned. */
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return request<User>("/api/auth/me", { method: "PATCH", body: fd });
  },
  changePassword: (current_password: string, new_password: string) =>
    request<void>("/api/auth/password/change", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
  mfaSetup: () =>
    request<{ secret: string; qr_code: string }>("/api/auth/mfa/totp/setup", {
      method: "POST",
      body: "{}",
    }),
  mfaActivate: (code: string) =>
    request<{ activated: boolean; recovery_codes: string[] }>(
      "/api/auth/mfa/totp/activate",
      { method: "POST", body: JSON.stringify({ code }) },
    ),
  mfaDisable: (password: string) =>
    request<void>("/api/auth/mfa/totp", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),
  regenerateRecoveryCodes: () =>
    request<{ recovery_codes: string[] }>("/api/auth/mfa/recovery-codes", {
      method: "POST",
      body: "{}",
    }),

  // ---- workspaces ----
  listWorkspaces: () => requestList<Workspace>("/api/workspaces/"),
  listWorkspacePages: (slug: string) =>
    requestList<PageListItem>(`/api/workspaces/${slug}/pages/`),
  createWorkspace: (body: {
    name: string;
    slug: string;
    permission: WorkspacePermission;
    require_mfa: boolean;
  }) =>
    request<Workspace>("/api/workspaces/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateWorkspace: (slug: string, patch: Partial<Workspace>) =>
    request<Workspace>(`/api/workspaces/${slug}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteWorkspace: (slug: string) =>
    request<void>(`/api/workspaces/${slug}/`, { method: "DELETE" }),

  // ---- members ----
  listMembers: (slug: string) =>
    requestList<Member>(`/api/workspaces/${slug}/members/`),
  updateMember: (slug: string, memberId: string, role: Role) =>
    request<Member>(`/api/workspaces/${slug}/members/${memberId}/`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  removeMember: (slug: string, memberId: string) =>
    request<void>(`/api/workspaces/${slug}/members/${memberId}/`, {
      method: "DELETE",
    }),

  // ---- invitations ----
  listWorkspaceInvitations: (slug: string) =>
    requestList<WorkspaceInvitation>(`/api/workspaces/${slug}/invitations/`),
  createInvitation: (slug: string, body: { email: string; role: Role }) =>
    request<WorkspaceInvitation>(`/api/workspaces/${slug}/invitations/`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  revokeInvitation: (slug: string, invitationId: string) =>
    request<void>(`/api/workspaces/${slug}/invitations/${invitationId}/`, {
      method: "DELETE",
    }),
  listMyInvitations: () => requestList<MyInvitation>("/api/invitations/"),
  getInvitation: (token: string) =>
    request<MyInvitation>(`/api/invitations/${token}/`),
  acceptInvitation: (token: string) =>
    request<Workspace>(`/api/invitations/${token}/accept`, { method: "POST", body: "{}" }),
  declineInvitation: (token: string) =>
    request<void>(`/api/invitations/${token}/decline`, { method: "POST", body: "{}" }),

  // ---- workflows ----
  listWorkflows: (slug: string) =>
    requestList<Workflow>(`/api/workflows/?workspace=${encodeURIComponent(slug)}`),
  createWorkflow: (body: {
    workspace: string;
    name: string;
    description?: string;
    stages: WorkflowStage[];
  }) =>
    request<Workflow>("/api/workflows/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateWorkflow: (id: string, patch: Partial<Workflow>) =>
    request<Workflow>(`/api/workflows/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteWorkflow: (id: string) =>
    request<void>(`/api/workflows/${id}/`, { method: "DELETE" }),
  getPageWorkflow: (pageId: string) =>
    request<PageWorkflow | null>(`/api/pages/${pageId}/workflow/`),
  assignPageWorkflow: (pageId: string, workflowId: string) =>
    request<PageWorkflow>(`/api/pages/${pageId}/workflow/`, {
      method: "POST",
      body: JSON.stringify({ workflow: workflowId }),
    }),
  unassignPageWorkflow: (pageId: string) =>
    request<void>(`/api/pages/${pageId}/workflow/`, { method: "DELETE" }),
  advancePageWorkflow: (pageId: string) =>
    request<PageWorkflow>(`/api/pages/${pageId}/workflow/advance`, {
      method: "POST",
      body: "{}",
    }),

  // ---- pages ----
  getPage: (id: string) => request<Page>(`/api/pages/${id}/`),
  createPage: (body: Partial<Page>) =>
    request<Page>("/api/pages/", { method: "POST", body: JSON.stringify(body) }),
  updatePage: (id: string, patch: Partial<Page>) =>
    request<Page>(`/api/pages/${id}/`, { method: "PATCH", body: JSON.stringify(patch) }),
  deletePage: (id: string) =>
    request<void>(`/api/pages/${id}/`, { method: "DELETE" }),
  versions: (id: string) => requestList<PageVersion>(`/api/pages/${id}/versions/`),
  versionDetail: (id: string, n: number) =>
    request<PageVersionDetail>(`/api/pages/${id}/versions/${n}/`),
  diff: (id: string, from: number, to: number) =>
    request<DiffResult>(`/api/pages/${id}/diff/?from=${from}&to=${to}`),
  restore: (id: string, n: number) =>
    request<{ restored_from: number; new_version: number }>(
      `/api/pages/${id}/restore/${n}/`,
      { method: "POST" },
    ),
  backlinks: (id: string) => requestList<PageListItem>(`/api/pages/${id}/backlinks/`),

  // ---- notifications ----
  listNotifications: (unread?: boolean) =>
    requestList<AppNotification>(
      `/api/notifications${unread ? "?unread=1" : ""}`,
    ),
  unreadCount: () =>
    request<{ count: number }>("/api/notifications/unread-count"),
  markRead: (id: string) =>
    request<{ ok: boolean }>(`/api/notifications/${id}/read`, {
      method: "POST",
      body: "{}",
    }),
  markAllRead: () =>
    request<{ marked: number }>("/api/notifications/read-all", {
      method: "POST",
      body: "{}",
    }),
  subscribePage: (pageId: string) =>
    request<{ subscribed: boolean }>(`/api/pages/${pageId}/subscribe`, {
      method: "POST",
      body: "{}",
    }),
  unsubscribePage: (pageId: string) =>
    request<{ subscribed: boolean }>(`/api/pages/${pageId}/subscribe`, {
      method: "DELETE",
    }),
  pageSubscription: (pageId: string) =>
    request<{ subscribed: boolean }>(`/api/pages/${pageId}/subscribe`),

  // ---- search ----
  search: (q: string, workspace?: string) =>
    requestList<SearchResult>(
      `/api/search?q=${encodeURIComponent(q)}` +
        (workspace ? `&workspace=${encodeURIComponent(workspace)}` : ""),
    ),
};

/** Base URL for allauth SSO web flows (opened in the browser). */
export const ssoLoginUrl = (provider: string): string =>
  `${API_URL}/accounts/${provider}/login/`;
