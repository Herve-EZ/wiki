import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthContext";
import { SiteConfigProvider } from "./config/SiteConfigContext";
import { persister, queryClient } from "./lib/queryClient";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* `buster` invalidates the persisted cache when the API shape changes
        (e.g. workspaces gained `my_role`) — bump it on breaking payloads. */}
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: "v2-my-role" }}
    >
      <SiteConfigProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SiteConfigProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
