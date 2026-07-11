import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "../components/Icon";
import type { Role } from "../lib/types";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  editor: "Éditeur",
  viewer: "Lecteur",
};

export function SettingsRoute() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

  return (
    <div className="settings-page">
      <div className="settings-head">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <Icon name="chevronDown" size={14} style={{ transform: "rotate(90deg)" }} /> Retour
        </button>
        <h3 style={{ margin: 0 }}>Paramètres</h3>
      </div>

      <div className="settings-grid">
        <ProfileSection />
        <SecuritySection mfaEnabled={!!user?.mfa_enabled} onChanged={() => void refresh()} />
        <PasswordSection />
        <InvitationsSection />
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ maxWidth: "none" }}>
      <h4>{title}</h4>
      {subtitle && <p className="sub">{subtitle}</p>}
      {children}
    </div>
  );
}

function ProfileSection() {
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const m = useMutation({
    mutationFn: () => api.updateProfile({ display_name: displayName, avatar_url: avatarUrl }),
    onSuccess: async () => {
      setNotice("Profil mis à jour.");
      await refresh();
    },
    onError: () => setError("Échec de la mise à jour."),
  });

  return (
    <Section title="Profil" subtitle={user?.email}>
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}
      <div className="field">
        <label htmlFor="pf-name">Nom affiché</label>
        <input id="pf-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pf-avatar">URL de l'avatar</label>
        <input id="pf-avatar" className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
      </div>
      <button className="btn btn-primary" disabled={m.isPending} onClick={() => { setError(""); setNotice(""); m.mutate(); }}>
        {m.isPending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </Section>
  );
}

function SecuritySection({ mfaEnabled, onChanged }: { mfaEnabled: boolean; onChanged: () => void }) {
  const [stage, setStage] = useState<"idle" | "setup">("idle");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const setupM = useMutation({
    mutationFn: () => api.mfaSetup(),
    onSuccess: (d) => {
      setSecret(d.secret);
      setQr(d.qr_code);
      setStage("setup");
      setError("");
    },
    onError: () => setError("Impossible de démarrer l'activation."),
  });

  const activateM = useMutation({
    mutationFn: () => api.mfaActivate(code),
    onSuccess: (d) => {
      setRecoveryCodes(d.recovery_codes);
      setStage("idle");
      setCode("");
      onChanged();
    },
    onError: (err) =>
      setError(err instanceof ApiError && err.status === 400 ? "Code invalide." : "Échec de l'activation."),
  });

  const disableM = useMutation({
    mutationFn: () => api.mfaDisable(password),
    onSuccess: () => {
      setPassword("");
      setRecoveryCodes(null);
      onChanged();
    },
    onError: (err) =>
      setError(err instanceof ApiError && err.status === 403 ? "Mot de passe incorrect." : "Échec de la désactivation."),
  });

  const regenM = useMutation({
    mutationFn: () => api.regenerateRecoveryCodes(),
    onSuccess: (d) => setRecoveryCodes(d.recovery_codes),
  });

  return (
    <Section title="Double authentification (2FA)" subtitle="Sécurisez votre compte avec une application TOTP.">
      {error && <p className="form-error">{error}</p>}

      {recoveryCodes && (
        <div className="recovery-box">
          <div className="row-title">Codes de récupération — conservez-les en lieu sûr</div>
          <div className="codes">
            {recoveryCodes.map((c) => (
              <code key={c}>{c}</code>
            ))}
          </div>
        </div>
      )}

      {mfaEnabled ? (
        <>
          <p className="mfa-note"><Icon name="check" size={12} style={{ color: "var(--presence)" }} /> 2FA activée sur ce compte.</p>
          <div className="field">
            <label htmlFor="mfa-pass">Mot de passe (pour désactiver)</label>
            <input id="mfa-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-danger" disabled={disableM.isPending || !password} onClick={() => { setError(""); disableM.mutate(); }}>
              Désactiver la 2FA
            </button>
            <button className="btn btn-ghost" disabled={regenM.isPending} onClick={() => regenM.mutate()}>
              Régénérer les codes de secours
            </button>
          </div>
        </>
      ) : stage === "idle" ? (
        <button className="btn btn-primary" disabled={setupM.isPending} onClick={() => { setError(""); setupM.mutate(); }}>
          Activer la 2FA
        </button>
      ) : (
        <>
          <p className="sub">Scannez ce QR code avec votre application, puis saisissez le code à 6 chiffres.</p>
          {qr && <img src={qr} alt="QR code TOTP" className="qr" />}
          <p className="muted" style={{ fontSize: 11.5, wordBreak: "break-all" }}>Clé : {secret}</p>
          <div className="field">
            <label htmlFor="mfa-code">Code à 6 chiffres</label>
            <input id="mfa-code" className="input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setStage("idle")}>Annuler</button>
            <button className="btn btn-primary" disabled={activateM.isPending || code.length < 6} onClick={() => { setError(""); activateM.mutate(); }}>
              {activateM.isPending ? "Vérification…" : "Confirmer"}
            </button>
          </div>
        </>
      )}
    </Section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const m = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => {
      setNotice("Mot de passe changé.");
      setCurrent("");
      setNext("");
    },
    onError: (err) =>
      setError(
        err instanceof ApiError && err.status === 400
          ? "Vérifiez le mot de passe actuel et la robustesse du nouveau."
          : "Échec du changement.",
      ),
  });

  return (
    <Section title="Mot de passe">
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}
      <div className="field">
        <label htmlFor="pw-cur">Mot de passe actuel</label>
        <input id="pw-cur" className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pw-new">Nouveau mot de passe</label>
        <input id="pw-new" className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={m.isPending || !current || !next} onClick={() => { setError(""); setNotice(""); m.mutate(); }}>
        {m.isPending ? "…" : "Changer le mot de passe"}
      </button>
    </Section>
  );
}

function InvitationsSection() {
  const qc = useQueryClient();
  const invitesQ = useQuery({ queryKey: ["my-invitations"], queryFn: () => api.listMyInvitations() });

  const acceptM = useMutation({
    mutationFn: (token: string) => api.acceptInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-invitations"] });
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
  const declineM = useMutation({
    mutationFn: (token: string) => api.declineInvitation(token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-invitations"] }),
  });

  const invites = invitesQ.data ?? [];

  return (
    <Section title="Invitations en attente" subtitle="Rejoignez un espace après acceptation.">
      {invites.length === 0 && <p className="muted">Aucune invitation en attente.</p>}
      {invites.map((inv) => (
        <div key={inv.id} className="row-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row-title">{inv.workspace_name}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {ROLE_LABEL[inv.role]} · invité par {inv.invited_by_name || inv.invited_by_email || "?"}
            </div>
          </div>
          <button className="btn btn-ghost" disabled={declineM.isPending} onClick={() => declineM.mutate(inv.token)}>
            Refuser
          </button>
          <button className="btn btn-primary" disabled={acceptM.isPending} onClick={() => acceptM.mutate(inv.token)}>
            Accepter
          </button>
        </div>
      ))}
    </Section>
  );
}
