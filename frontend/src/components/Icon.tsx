import type { CSSProperties } from "react";

/** Stroke icon set (1.6px), matching the validated mockup. No emoji. */
const PATHS: Record<string, string> = {
  at: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z M13.73 21a2 2 0 0 1-3.46 0",
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
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9.6 9a2.5 2.5 0 0 1 4.9.6c0 1.6-2.5 2.1-2.5 3.6 M12 16.8h.01",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M22 21v-2a4 4 0 0 0-3-3.87 M15.5 3.63a4 4 0 0 1 0 7.75",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  shield: "M12 3l8 3v6c0 4.6-3.2 7.6-8 9-4.8-1.4-8-4.4-8-9V6z M9 12l2 2 4-4",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M3 7l9 6 9-6",
  wifi: "M2 8.8a15 15 0 0 1 20 0 M5 12.5a10 10 0 0 1 14 0 M8.5 16a5 5 0 0 1 7 0 M12 20h.01",
  download: "M12 3v12 M7 10l5 5 5-5 M5 21h14",
  upload: "M12 21V9 M7 14l5-5 5 5 M5 3h14",
  bold: "M7 5v14 M7 5h6a3.5 3.5 0 0 1 0 7H7 M7 12h7a3.5 3.5 0 0 1 0 7H7",
  italic: "M19 5h-6 M11 19H5 M15 5 9 19",
  strike: "M5 12h14 M8 8c0-2 2-3 4-3s3 1 3 2 M16 16c0 2-2 3-4 3s-4-1-4-3",
  heading: "M6 5v14 M18 5v14 M6 12h12",
  list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  checkSquare: "M9 11l3 3 6-6 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  quote: "M8 6H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3 M8 12c0 3-1 4-3 5 M20 6h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3 M20 12c0 3-1 4-3 5",
  code: "m8 8-4 4 4 4 M16 8l4 4-4 4 M13 5l-2 14",
  table: "M3 5h18v14H3z M3 10h18 M3 15h18 M9 5v14 M15 5v14",
  alignLeft: "M4 6h16 M4 12h10 M4 18h13",
  trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
  alignCenter: "M4 6h16 M7 12h10 M6 18h12",
  alignRight: "M4 6h16 M10 12h10 M7 18h13",
  diagram: "M4 4h6v4H4z M14 16h6v4h-6z M7 8v4h10v4",
  comment: "M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
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
