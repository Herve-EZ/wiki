/**
 * TanStack Query client with persistence. The cache is written to storage so a
 * cold desktop launch shows the last-known pages instantly, before (or without)
 * the network. Query network mode is "offlineFirst": queries run from cache and
 * only hit the network when it's available.
 */
import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24, // keep for a day so offline reads survive
      retry: 1,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

export const persister: Persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "wikicollab.query-cache",
});
