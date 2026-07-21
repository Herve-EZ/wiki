import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { isTauri } from "../lib/platform";
import { useAuth } from "../auth/AuthContext";
import { useSync } from "../hooks/useSync";
import { useForcedOffline } from "../hooks/useForcedOffline";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import type { Role } from "../lib/types";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  editor: "Éditeur",
  viewer: "Lecteur",
};

type Tab = "profile" | "security" | "sync" | "invitations";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "profile", label: "Profil", icon: "user" },
  { id: "security", label: "Sécurité & 2FA", icon: "shield" },
  { id: "sync", label: "Synchronisation", icon: "refresh" },
  { id: "invitations", label: "Invitations", icon: "mail" },
];

export function SettingsRoute() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const invitesQ = useQuery({ queryKey: ["my-invitations"], queryFn: () => api.listMyInvitations() });
  const inviteCount = invitesQ.data?.length ?? 0;

  return (
    <div className="settings-page">
      <div className="settings-head">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <Icon name="chevronDown" size={14} style={{ transform: "rotate(90deg)" }} /> Retour
        </button>
        <h3 style={{ margin: 0 }}>Paramètres</h3>
      </div>

      <div className="settings-shell">
        <nav className="settings-nav">
          {user && (
            <div className="settings-me">
              <Avatar seed={user.email} label={user.display_name || user.email} src={user.avatar_url || undefined} size={38} />
              <div style={{ minWidth: 0 }}>
                <div className="row-title">{user.display_name || "Sans nom"}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{user.email}</div>
              </div>
            </div>
          )}
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`settings-nav-item${tab === n.id ? " active" : ""}`}
              onClick={() => setTab(n.id)}
            >
              <Icon name={n.icon} size={15} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.id === "invitations" && inviteCount > 0 && (
                <span className="sync-badge">{inviteCount}</span>
              )}
            </button>
          ))}
          <div className="settings-nav-sep" />
          <button className="settings-nav-item" onClick={() => navigate("/help")}>
            <Icon name="help" size={15} />
            <span style={{ flex: 1 }}>Aide</span>
          </button>
        </nav>

        <div className="settings-panel">
          {tab === "profile" && <ProfileSection onChanged={() => void refresh()} />}
          {tab === "security" && <SecuritySection mfaEnabled={!!user?.mfa_enabled} onChanged={() => void refresh()} />}
          {tab === "sync" && <SyncSection />}
          {tab === "invitations" && <InvitationsSection />}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="panel-card">
      <div className="panel-title">
        <Icon name={icon} size={17} />
        <div>
          <h4 style={{ margin: 0 }}>{title}</h4>
          {subtitle && <p className="muted" style={{ margin: "2px 0 0" }}>{subtitle}</p>}
        </div>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`switch${disabled ? " disabled" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="track"><span className="knob" /></span>
    </label>
  );
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

function ProfileSection({ onChanged }: { onChanged: () => void }) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Veuillez choisir un fichier image.");
      return;
    }
    if (f.size > MAX_AVATAR_BYTES) {
      setError("Image trop volumineuse (5 Mo maximum).");
      return;
    }
    setError("");
    setNotice("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const m = useMutation({
    mutationFn: async () => {
      // Text field first, then the photo upload (multipart) if one was picked.
      await api.updateProfile({ display_name: displayName });
      if (file) await api.uploadAvatar(file);
    },
    onSuccess: () => {
      setNotice("Profil mis à jour.");
      setFile(null);
      setPreview(null);
      onChanged();
    },
    onError: () => setError("Échec de la mise à jour."),
  });

  const currentAvatar = preview ?? user?.avatar_url ?? undefined;

  return (
    <Panel title="Profil" subtitle="Vos informations personnelles" icon="user">
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}

      <div className="field">
        <label>Photo de profil</label>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {user && (
            <Avatar
              seed={user.email}
              label={user.display_name || user.email}
              src={currentAvatar}
              size={64}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={pickFile}
            />
            <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
              <Icon name="user" size={13} /> Choisir une image…
            </button>
            <span className="muted" style={{ fontSize: 11.5 }}>
              {file ? file.name : "JPG, PNG ou GIF — 5 Mo max."}
            </span>
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="pf-name">Nom affiché</label>
        <input id="pf-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={m.isPending} onClick={() => { setError(""); setNotice(""); m.mutate(); }}>
        {m.isPending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </Panel>
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
    onSuccess: (d) => { setSecret(d.secret); setQr(d.qr_code); setStage("setup"); setError(""); },
    onError: () => setError("Impossible de démarrer l'activation."),
  });
  const activateM = useMutation({
    mutationFn: () => api.mfaActivate(code),
    onSuccess: (d) => { setRecoveryCodes(d.recovery_codes); setStage("idle"); setCode(""); onChanged(); },
    onError: (err) => setError(err instanceof ApiError && err.status === 400 ? "Code invalide." : "Échec de l'activation."),
  });
  const disableM = useMutation({
    mutationFn: () => api.mfaDisable(password),
    onSuccess: () => { setPassword(""); setRecoveryCodes(null); onChanged(); },
    onError: (err) => setError(err instanceof ApiError && err.status === 403 ? "Mot de passe incorrect." : "Échec de la désactivation."),
  });
  const regenM = useMutation({
    mutationFn: () => api.regenerateRecoveryCodes(),
    onSuccess: (d) => setRecoveryCodes(d.recovery_codes),
  });

  return (
    <>
      <Panel title="Double authentification (2FA)" subtitle="Un second facteur TOTP protège votre compte" icon="shield">
        {error && <p className="form-error">{error}</p>}

        <div className="setting-row">
          <div className="switch-text">
            <b>Authentification à deux facteurs</b>
            <span className="muted">
              {mfaEnabled ? "Activée — un code est demandé à la connexion." : "Désactivée."}
            </span>
          </div>
          <span className={`status-pill ${mfaEnabled ? "ok" : "off"}`}>
            <Icon name={mfaEnabled ? "check" : "x"} size={11} /> {mfaEnabled ? "Activée" : "Inactive"}
          </span>
        </div>

        {recoveryCodes && (
          <div className="recovery-box">
            <div className="row-title">Codes de récupération — conservez-les en lieu sûr</div>
            <div className="codes">{recoveryCodes.map((c) => <code key={c}>{c}</code>)}</div>
          </div>
        )}

        {mfaEnabled ? (
          <>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="mfa-pass">Mot de passe (pour désactiver)</label>
              <input id="mfa-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-danger" disabled={disableM.isPending || !password} onClick={() => { setError(""); disableM.mutate(); }}>
                Désactiver la 2FA
              </button>
              <button className="btn btn-ghost" disabled={regenM.isPending} onClick={() => regenM.mutate()}>
                Régénérer les codes de secours
              </button>
            </div>
          </>
        ) : stage === "idle" ? (
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={setupM.isPending} onClick={() => { setError(""); setupM.mutate(); }}>
            <Icon name="lock" size={13} /> Activer la 2FA
          </button>
        ) : (
          <div className="mfa-setup">
            <p className="muted">Scannez ce QR code avec votre application (Google Authenticator, Authy…), puis saisissez le code à 6 chiffres.</p>
            <div className="mfa-setup-grid">
              {qr && <img src={qr} alt="QR code TOTP" className="qr" />}
              <div style={{ flex: 1, minWidth: 200 }}>
                <p className="muted" style={{ fontSize: 11, wordBreak: "break-all" }}>Clé manuelle : <code>{secret}</code></p>
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
              </div>
            </div>
          </div>
        )}
      </Panel>

      <PasswordCard />
    </>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const m = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => { setNotice("Mot de passe changé."); setCurrent(""); setNext(""); },
    onError: (err) => setError(err instanceof ApiError && err.status === 400 ? "Vérifiez le mot de passe actuel et la robustesse du nouveau (8+ caractères)." : "Échec du changement."),
  });

  return (
    <Panel title="Mot de passe" subtitle="Changez votre mot de passe de connexion" icon="key">
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
    </Panel>
  );
}

function SyncSection() {
  const { online, pending, conflicts, syncing, lastSyncAt, sync } = useSync();
  const [forcedOffline, setForcedOffline] = useForcedOffline();
  const desktop = isTauri();

  const lastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <Panel title="Synchronisation" subtitle="État de la connexion et de vos données locales" icon="refresh">
      <div className="sync-stats">
        <div className="stat-chip">
          <span className={`status-pill ${online ? "ok" : "off"}`}>
            <Icon name={online ? "wifi" : "wifiOff"} size={12} /> {online ? "En ligne" : "Hors-ligne"}
          </span>
        </div>
        <div className="stat-chip"><b>{pending}</b><span className="muted">en attente</span></div>
        <div className="stat-chip"><b>{conflicts}</b><span className="muted">conflit(s)</span></div>
        <div className="stat-chip"><b>{lastSync}</b><span className="muted">dernière synchro</span></div>
      </div>

      <button className="btn btn-primary" disabled={syncing} onClick={() => void sync()} style={{ marginTop: 4 }}>
        <Icon name="refresh" size={13} className={syncing ? "ic spin" : "ic"} />
        {syncing ? "Synchronisation…" : "Synchroniser maintenant"}
      </button>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        La synchronisation envoie vos modifications locales et recharge les données du serveur.
      </p>

      {desktop ? (
        <div className="setting-row" style={{ marginTop: 18 }}>
          <div className="switch-text">
            <b>Travailler hors-ligne</b>
            <span className="muted">
              Force le mode hors-ligne : lecture depuis le cache local, modifications mises en file d'attente.
            </span>
          </div>
          <Switch checked={forcedOffline} onChange={setForcedOffline} />
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          <Icon name="alert" size={12} /> Le mode hors-ligne complet (cache local) est disponible dans l'application de bureau.
        </p>
      )}
    </Panel>
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
    <Panel title="Invitations en attente" subtitle="Rejoignez un espace après acceptation" icon="mail">
      {invites.length === 0 && (
        <div className="home-empty" style={{ padding: "24px 0" }}>
          <Icon name="mail" size={24} />
          <p className="muted" style={{ marginTop: 8 }}>Aucune invitation en attente.</p>
        </div>
      )}
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
    </Panel>
  );
}
