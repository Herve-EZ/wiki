import { useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError, NetworkError, api, ssoLoginUrl } from "../lib/api";
import { openExternal } from "../lib/native";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "../components/Icon";

interface LoginNavState {
  next?: string;
  email?: string;
}

const SSO = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "microsoft", label: "Microsoft" },
  { id: "saml", label: "SSO entreprise" },
];

export function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as LoginNavState | null) ?? {};
  const next = navState.next ?? "/";
  const { login, verifyMfa, refresh, status } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(navState.email ?? "");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  function friendlyError(err: unknown): string {
    if (err instanceof NetworkError) return "Serveur injoignable. Vérifiez votre connexion.";
    if (err instanceof ApiError && err.status === 401) return "Email ou mot de passe incorrect.";
    if (err instanceof ApiError && err.status === 429) return "Trop de tentatives. Réessayez plus tard.";
    return "Une erreur est survenue. Réessayez.";
  }

  async function onSubmitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await login(email, password);
      if (result.kind === "mfa") setChallenge(result.challengeToken);
      else navigate(next);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.register({ email, password, display_name: displayName });
      const result = await login(email, password);
      if (result.kind === "mfa") setChallenge(result.challengeToken);
      else {
        await refresh();
        navigate(next);
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "Inscription impossible : email déjà utilisé ou mot de passe trop faible (8+ caractères)."
          : friendlyError(err),
      );
    } finally {
      setBusy(false);
    }
  }

  function onOtpChange(i: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      await verifyMfa(challenge, code.join(""));
      navigate(next);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "Code invalide ou expiré."
          : friendlyError(err),
      );
    } finally {
      setBusy(false);
    }
  }

  if (status === "authenticated") return <Navigate to={next} replace />;

  const isRegister = mode === "register";

  return (
    <div className="auth-page">
      {challenge === null ? (
        <form className="card" onSubmit={isRegister ? onSubmitRegister : onSubmitLogin}>
          <h4>{isRegister ? "Créer un compte" : "Connexion à WikiCollab"}</h4>
          <p className="sub">Wiki collaboratif self-hosted — vos données restent chez vous.</p>

          {error && <p className="form-error">{error}</p>}

          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {isRegister && (
            <div className="field">
              <label htmlFor="display_name">Nom affiché</label>
              <input
                id="display_name"
                className="input"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy
              ? isRegister ? "Création…" : "Connexion…"
              : isRegister ? "Créer mon compte" : "Se connecter"}
          </button>

          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button
              type="button"
              className="link"
              onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); }}
            >
              {isRegister ? "J'ai déjà un compte — me connecter" : "Créer un compte"}
            </button>
          </div>

          <div className="div-or">ou continuer avec</div>
          <div className="sso-grid">
            {SSO.map((s) => (
              <button
                key={s.id}
                type="button"
                className="sso"
                onClick={() => void openExternal(ssoLoginUrl(s.id))}
              >
                {s.label}
              </button>
            ))}
          </div>
        </form>
      ) : (
        <form className="card" onSubmit={onVerify}>
          <h4>Vérification en deux étapes</h4>
          <p className="sub">Saisissez le code à 6 chiffres de votre application d'authentification.</p>

          {error && <p className="form-error">{error}</p>}

          <div className="otp-row">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                className={`otp${d ? " filled" : ""}`}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => onOtpChange(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !code[i] && i > 0) otpRefs.current[i - 1]?.focus();
                }}
              />
            ))}
          </div>
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={busy || code.join("").length < 6}
          >
            {busy ? "Vérification…" : "Vérifier et ouvrir l'espace"}
          </button>
          <div style={{ marginTop: 12 }}>
            <button type="button" className="link" onClick={() => { setChallenge(null); setError(""); }}>
              Utiliser un code de secours ou revenir
            </button>
          </div>
          <div className="mfa-note">
            <Icon name="clock" size={12} />
            Jeton de vérification à usage unique, valable 5 minutes.
          </div>
        </form>
      )}
    </div>
  );
}
