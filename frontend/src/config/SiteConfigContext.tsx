import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { SiteConfig } from "../lib/types";

/** Fallback branding used before the public config loads (or when offline).
 * SSO providers default to empty: a button is only ever shown once the server
 * confirms the provider is both enabled and configured. */
export const DEFAULT_CONFIG: SiteConfig = {
  site_name: "WikiCollab",
  tagline: "Wiki collaboratif self-hosted — vos données restent chez vous.",
  logo_svg: "",
  primary_color: "#534ab7",
  primary_color_dark: "#8b84e8",
  support_email: "",
  login_title: "",
  login_subtitle: "",
  allow_registration: true,
  enable_email_login: true,
  sso_providers: [],
};

interface SiteConfigState {
  config: SiteConfig;
  isLoading: boolean;
}

const SiteConfigContext = createContext<SiteConfigState | null>(null);

function isSvg(markup: string): boolean {
  return markup.trim().toLowerCase().startsWith("<svg");
}

/** Apply the white-label settings to the live document: title, accent colour
 * (theme-aware, so dark mode still switches) and favicon. */
function applyBranding(cfg: SiteConfig) {
  document.title = cfg.site_name;

  const light = cfg.primary_color || DEFAULT_CONFIG.primary_color;
  const dark = cfg.primary_color_dark || DEFAULT_CONFIG.primary_color_dark;
  let style = document.getElementById("brand-vars");
  if (!style) {
    style = document.createElement("style");
    style.id = "brand-vars";
    document.head.appendChild(style);
  }
  style.textContent = [
    `:root{--accent:${light};--accent-strong:${light};}`,
    `:root[data-theme="dark"]{--accent:${dark};--accent-strong:${dark};}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--accent:${dark};--accent-strong:${dark};}}`,
  ].join("\n");

  if (cfg.logo_svg && isSvg(cfg.logo_svg)) {
    const href = "data:image/svg+xml;utf8," + encodeURIComponent(cfg.logo_svg);
    document.querySelector('link[rel="icon"]')?.setAttribute("href", href);
  }
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ["site-config"],
    queryFn: api.getConfig,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const config = query.data ?? DEFAULT_CONFIG;

  useEffect(() => {
    applyBranding(config);
  }, [config]);

  return (
    <SiteConfigContext.Provider value={{ config, isLoading: query.isLoading }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfigState {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error("useSiteConfig must be used within <SiteConfigProvider>");
  return ctx;
}
