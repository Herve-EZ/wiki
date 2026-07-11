/**
 * REST client for the Django backend. Attaches the JWT access token, refreshes
 * once on a 401, and distinguishes "server said no" (ApiError) from "couldn't
 * reach the server" (NetworkError) so the offline layer can react correctly.
 */
import { clearTokens, loadTokens, saveTokens } from "./auth";
import { reportBackendReachable } from "./network";
import type {
  DiffResult,
  LoginResult,
  Page,
  PageListItem,
  PageVersion,
  PageVersionDetail,
  User,
  Workspace,
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
  const tokens = await loadTokens();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
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
  // ---- auth ----
  async login(email: string, password: string): Promise<LoginResult> {
    const data = await publicPost<LoginResponse>("/api/auth/token", { email, password });
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
  me: () => request<User>("/api/auth/me"),

  // ---- workspaces ----
  listWorkspaces: () => requestList<Workspace>("/api/workspaces/"),
  listWorkspacePages: (slug: string) =>
    requestList<PageListItem>(`/api/workspaces/${slug}/pages/`),

  // ---- pages ----
  getPage: (id: string) => request<Page>(`/api/pages/${id}/`),
  createPage: (body: Partial<Page>) =>
    request<Page>("/api/pages/", { method: "POST", body: JSON.stringify(body) }),
  updatePage: (id: string, patch: Partial<Page>) =>
    request<Page>(`/api/pages/${id}/`, { method: "PATCH", body: JSON.stringify(patch) }),
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

  // ---- search ----
  search: (q: string, workspace?: string) =>
    requestList<PageListItem>(
      `/api/search?q=${encodeURIComponent(q)}` +
        (workspace ? `&workspace=${encodeURIComponent(workspace)}` : ""),
    ),
};

/** Base URL for allauth SSO web flows (opened in the browser). */
export const ssoLoginUrl = (provider: string): string =>
  `${API_URL}/accounts/${provider}/login/`;
