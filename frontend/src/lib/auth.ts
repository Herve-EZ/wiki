/**
 * JWT storage. On desktop the tokens live in an encrypted-at-rest Tauri store
 * file; on web they fall back to localStorage. One async interface for both so
 * callers never branch on the platform.
 */
import { isTauri } from "./platform";

export interface Tokens {
  access: string;
  refresh: string;
}

const KEY = "wikicollab.tokens";

type StoreApi = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  save(): Promise<void>;
};

let storePromise: Promise<StoreApi> | null = null;

async function tauriStore(): Promise<StoreApi> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then((m) =>
      m.load("auth.json"),
    ) as unknown as Promise<StoreApi>;
  }
  return storePromise;
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  if (isTauri()) {
    const store = await tauriStore();
    await store.set(KEY, tokens);
    await store.save();
  } else {
    localStorage.setItem(KEY, JSON.stringify(tokens));
  }
}

export async function loadTokens(): Promise<Tokens | null> {
  if (isTauri()) {
    const store = await tauriStore();
    return (await store.get<Tokens>(KEY)) ?? null;
  }
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Tokens) : null;
}

export async function clearTokens(): Promise<void> {
  if (isTauri()) {
    const store = await tauriStore();
    await store.delete(KEY);
    await store.save();
  } else {
    localStorage.removeItem(KEY);
  }
}
