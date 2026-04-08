"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState } from "react";

const persister = typeof window !== "undefined"
  ? createSyncStoragePersister({ storage: window.localStorage, key: "dgpt-cache" })
  : undefined;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 min default
            gcTime: 24 * 60 * 60 * 1000, // 24h — keep in memory/storage long
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  if (!persister) {
    // SSR fallback — still need QueryClientProvider for useQueryClient() calls
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // persist cache for 24h
        buster: "v1", // bump to invalidate all caches
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
