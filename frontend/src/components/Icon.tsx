import type { CSSProperties } from "react";

/** Stroke icon set (1.6px), matching the validated mockup. No emoji. */
const PATHS: Record<string, string> = {
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z",
  file: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z M14 3v5h5",
  home: "M3 10.5 12 3l9 7.5 M5 9.5V21h14V9.5",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 3",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-4.3-4.3",
  lock: "M5 11h14v9a0 0 0 0 1 0 0H5a0 0 0 0 1 0 0z M8 11V7a4 4 0 0 1 8 0v4",
  history: "M3 12a9 9 0 1 0 9-9 M3 4v5h5 M12 7v5l3 3",
  refresh: "M3 12a9 9 0 1 0 9-9 M3 4v5h5",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  check: "M20 6 9 17l-5-5",
  chevronDown: "m6 9 6 6 6-6",
  x: "M18 6 6 18 M6 6l12 12",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-1.7-1L14 3h-4l-.3 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 1.7 1L10 21h4l.3-2.5a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5z",
  sun: "M12 4V2 M12 22v-2 M4 12H2 M22 12h-2 M6 6 4.5 4.5 M19.5 19.5 18 18 M18 6l1.5-1.5 M4.5 19.5 6 18 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  monitor: "M3 4h18v12H3z M8 20h8 M12 16v4",
  wifiOff: "M2 8.8a15 15 0 0 1 5-3 M20 8.8a15 15 0 0 0-6-3.4 M8.5 12.5a9 9 0 0 1 3-1.4 M6 16a5 5 0 0 1 3-1.8 M12 20h.01 M2 2l20 20",
  plus: "M12 5v14 M5 12h14",
  alert: "M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  key: "M15 7a4 4 0 1 1-3.9 5H8v3H5v3H2v-3l6.1-6.1A4 4 0 0 1 15 7z",
};

interface Props {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 14, className = "ic", style }: Props) {
  const d = PATHS[name];
  const segments = d ? d.split(" M").map((s, i) => (i === 0 ? s : "M" + s)) : [];
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      {segments.map((seg, i) => (
        <path key={i} d={seg} />
      ))}
    </svg>
  );
}
