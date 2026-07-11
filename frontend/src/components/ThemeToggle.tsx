import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";

const LABELS = { light: "Thème clair", dark: "Thème sombre", system: "Thème système" };

export function ThemeToggle() {
  const { theme, cycle } = useTheme();
  const icon = theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor";
  return (
    <button className="icon-btn" onClick={cycle} title={LABELS[theme]} aria-label={LABELS[theme]}>
      <Icon name={icon} size={16} />
    </button>
  );
}
