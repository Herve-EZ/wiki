import { avatarColor, initials } from "../lib/avatar";

interface Props {
  seed: string;
  label: string;
  /** Public URL of an uploaded profile photo; falls back to initials if absent. */
  src?: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, label, src, size = 26, className = "av" }: Props) {
  const c = avatarColor(seed);
  if (src) {
    return (
      <img
        className={className}
        src={src}
        alt={label}
        title={label}
        style={{ width: size, height: size, objectFit: "cover" }}
      />
    );
  }
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
