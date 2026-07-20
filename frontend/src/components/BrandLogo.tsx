import { useSiteConfig } from "../config/SiteConfigContext";

interface Props {
  size?: number;
  className?: string;
}

/** Default WikiCollab mark — overlapping wiki pages on a violet gradient.
 * Used whenever no custom logo SVG is configured. */
function DefaultLogo({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wc_bg" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7a6cf5" />
          <stop offset="1" stopColor="#463aa8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#wc_bg)" />
      <rect x="17" y="10.5" width="17" height="22" rx="3" fill="#ffffff" opacity="0.38" transform="rotate(8 24 21)" />
      <path d="M15 14a3 3 0 0 1 3-3h9l5 5v16a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V14z" fill="#ffffff" />
      <path d="M27 11l5 5h-4a1 1 0 0 1-1-1v-4z" fill="#cfc8fb" />
      <rect x="18.5" y="20" width="11" height="2" rx="1" fill="#5b4fd0" />
      <rect x="18.5" y="24" width="11" height="2" rx="1" fill="#b7b1ef" />
      <rect x="18.5" y="28" width="7" height="2" rx="1" fill="#b7b1ef" />
    </svg>
  );
}

export function BrandLogo({ size = 40, className }: Props) {
  const { config } = useSiteConfig();
  const custom = config.logo_svg?.trim();

  if (custom && custom.toLowerCase().startsWith("<svg")) {
    return (
      <span
        className={`brand-logo ${className ?? ""}`}
        style={{ width: size, height: size, display: "inline-flex" }}
        // Config is authored by system admins only; treated as trusted markup.
        dangerouslySetInnerHTML={{ __html: custom }}
      />
    );
  }
  return <DefaultLogo size={size} className={className} />;
}
