import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "wikicollab.theme";

function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function read(): Theme {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

/** Light / dark / system theme, persisted, applied via `data-theme` on <html>. */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; cycle: () => void } {
  const [theme, setThemeState] = useState<Theme>(read);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
  }, []);

  const cycle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, cycle };
}
