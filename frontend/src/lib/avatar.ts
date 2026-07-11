/** Deterministic avatar initials + token-based colours from a seed string. */
const PALETTE: { bg: string; fg: string }[] = [
  { bg: "var(--accent-wash)", fg: "var(--accent-on-wash)" },
  { bg: "var(--presence-wash)", fg: "var(--presence)" },
  { bg: "var(--warn-wash)", fg: "var(--warn)" },
];

export function initials(nameOrEmail: string): string {
  const name = nameOrEmail.split("@")[0];
  const parts = name.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function avatarColor(seed: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
