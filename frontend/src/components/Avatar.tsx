import { avatarColor, initials } from "../lib/avatar";

interface Props {
  seed: string;
  label: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, label, size = 26, className = "av" }: Props) {
  const c = avatarColor(seed);
  return (
    <span
      className={className}
      title={label}
      style={{ background: c.bg, color: c.fg, width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(label)}
    </span>
  );
}
