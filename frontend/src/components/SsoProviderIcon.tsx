import { Icon } from "./Icon";

/** Official-ish brand marks for the SSO providers the backend can expose
 * ("google" | "github" | "microsoft" | "saml"). Rendered inside the SSO
 * buttons on the login page. Unknown providers fall back to a shield. */
export function SsoProviderIcon({ id, size = 18 }: { id: string; size?: number }) {
  const s = { width: size, height: size, display: "block", flex: "none" } as const;

  switch (id) {
    case "google":
      return (
        <svg viewBox="0 0 24 24" style={s} aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
          />
        </svg>
      );
    case "github":
      return (
        <svg viewBox="0 0 24 24" style={s} aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 1C5.92 1 1 5.92 1 12c0 4.86 3.15 8.98 7.52 10.44.55.1.75-.24.75-.53 0-.26-.01-.95-.02-1.87-3.06.67-3.71-1.47-3.71-1.47-.5-1.27-1.22-1.61-1.22-1.61-1-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.98 1.68 2.57 1.2 3.2.92.1-.72.38-1.2.69-1.48-2.44-.28-5.01-1.22-5.01-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.92 0 0 .92-.29 3.02 1.13a10.5 10.5 0 0 1 5.5 0c2.1-1.42 3.02-1.13 3.02-1.13.6 1.52.22 2.64.11 2.92.7.77 1.13 1.75 1.13 2.95 0 4.22-2.58 5.15-5.03 5.42.4.34.74 1.01.74 2.04 0 1.47-.01 2.66-.01 3.02 0 .29.2.64.76.53A11.01 11.01 0 0 0 23 12c0-6.08-4.92-11-11-11z"
          />
        </svg>
      );
    case "microsoft":
      return (
        <svg viewBox="0 0 24 24" style={s} aria-hidden="true">
          <path fill="#F25022" d="M2 2h9.3v9.3H2z" />
          <path fill="#7FBA00" d="M12.7 2H22v9.3h-9.3z" />
          <path fill="#00A4EF" d="M2 12.7h9.3V22H2z" />
          <path fill="#FFB900" d="M12.7 12.7H22V22h-9.3z" />
        </svg>
      );
    default:
      // SAML / any custom provider.
      return <Icon name="shield" size={size} style={{ color: "var(--accent)" }} />;
  }
}
