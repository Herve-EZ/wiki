import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { BrandLogo } from "../components/BrandLogo";
import { Icon } from "../components/Icon";
import type { AdminSiteConfig } from "../lib/types";

type Tab = "branding" | "auth" | "admins";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "branding", label: "Marque & apparence", icon: "settings" },
  { id: "auth", label: "Authentification", icon: "lock" },
  { id: "admins", label: "Administrateurs", icon: "shield" },
];

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

export function AdminRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("branding");

  // Route is also guarded in App, but keep a hard client-side gate.
  if (user && !user.is_system_admin) return <Navigate to="/" replace />;

  return (
    <div className="settings-page">
      <div className="settings-head">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <Icon name="chevronDown" size={14} style={{ transform: "rotate(90deg)" }} /> Retour
        </button>
        <h3 style={{ margin: 0 }}>Administration système</h3>
      </div>

      <div className="settings-shell">
        <nav className="settings-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`settings-nav-item${tab === n.id ? " active" : ""}`}
              onClick={() => setTab(n.id)}
            >
              <Icon name={n.icon} size={15} />
              <span style={{ flex: 1 }}>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings-panel">
          {tab === "branding" && <BrandingSection />}
          {tab === "auth" && <AuthSection />}
          {tab === "admins" && <AdminsSection />}
        </div>
      </div>
    </div>
  );
}

/** Load the admin config once and expose a partial-patch mutation. */
function useAdminConfig() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin-config"], queryFn: api.getAdminConfig });
  const mutation = useMutation({
    mutationFn: (patch: Partial<AdminSiteConfig>) => api.updateAdminConfig(patch),
    onSuccess: (data) => {
      qc.setQueryData(["admin-config"], data);
      // Branding changed → refresh the public config that drives the live UI.
      void qc.invalidateQueries({ queryKey: ["site-config"] });
    },
  });
  return { query, mutation };
}

function BrandingSection() {
  const { query, mutation } = useAdminConfig();
  const cfg = query.data;

  const [form, setForm] = useState<Partial<AdminSiteConfig>>({});
  const [notice, setNotice] = useState("");

  // Seed the local form once the config arrives.
  useEffect(() => {
    if (cfg) {
      setForm({
        site_name: cfg.site_name,
        tagline: cfg.tagline,
        login_title: cfg.login_title,
        login_subtitle: cfg.login_subtitle,
        primary_color: cfg.primary_color,
        primary_color_dark: cfg.primary_color_dark,
        support_email: cfg.support_email,
        logo_svg: cfg.logo_svg,
      });
    }
  }, [cfg]);

  if (query.isLoading || !cfg) return <Panel title="Marque & apparence" icon="settings"><p className="muted">Chargement…</p></Panel>;

  const set = (k: keyof AdminSiteConfig, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const logoPreview = (form.logo_svg ?? "").trim();

  return (
    <>
      <Panel title="Identité" subtitle="Nom, accroche et logo de votre instance" icon="settings">
        {notice && <p className="form-notice">{notice}</p>}
        <div className="field">
          <label htmlFor="cfg-name">Nom de l'application</label>
          <input id="cfg-name" className="input" value={form.site_name ?? ""} onChange={(e) => set("site_name", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cfg-tagline">Accroche</label>
          <input id="cfg-tagline" className="input" value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cfg-support">Email de support (optionnel)</label>
          <input id="cfg-support" className="input" type="email" value={form.support_email ?? ""} onChange={(e) => set("support_email", e.target.value)} placeholder="support@exemple.com" />
        </div>

        <div className="logo-preview">
          {logoPreview.toLowerCase().startsWith("<svg") ? (
            <span className="brand-logo" style={{ width: 48, height: 48, display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: logoPreview }} />
          ) : (
            <BrandLogo size={48} />
          )}
          <div className="muted" style={{ fontSize: 12 }}>
            Aperçu du logo. Collez un SVG complet ci-dessous, ou laissez vide pour le logo par défaut.
          </div>
        </div>
        <div className="field">
          <label htmlFor="cfg-logo">Logo (markup SVG)</label>
          <textarea
            id="cfg-logo"
            className="input"
            rows={5}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}
            value={form.logo_svg ?? ""}
            onChange={(e) => set("logo_svg", e.target.value)}
            placeholder="<svg …>…</svg>"
          />
        </div>
      </Panel>

      <Panel title="Couleurs" subtitle="Teinte d'accent en thème clair et sombre" icon="settings">
        <div className="field">
          <label>Accent — thème clair</label>
          <div className="color-field">
            <input type="color" value={form.primary_color ?? "#534ab7"} onChange={(e) => set("primary_color", e.target.value)} />
            <input className="input" value={form.primary_color ?? ""} onChange={(e) => set("primary_color", e.target.value)} style={{ maxWidth: 130 }} />
          </div>
        </div>
        <div className="field">
          <label>Accent — thème sombre</label>
          <div className="color-field">
            <input type="color" value={form.primary_color_dark ?? "#8b84e8"} onChange={(e) => set("primary_color_dark", e.target.value)} />
            <input className="input" value={form.primary_color_dark ?? ""} onChange={(e) => set("primary_color_dark", e.target.value)} style={{ maxWidth: 130 }} />
          </div>
        </div>
      </Panel>

      <Panel title="Page de connexion" subtitle="Textes affichés sur l'écran de connexion" icon="lock">
        <div className="field">
          <label htmlFor="cfg-lt">Titre (vide → « Connexion à &lt;nom&gt; »)</label>
          <input id="cfg-lt" className="input" value={form.login_title ?? ""} onChange={(e) => set("login_title", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cfg-ls">Sous-titre (vide → accroche)</label>
          <input id="cfg-ls" className="input" value={form.login_subtitle ?? ""} onChange={(e) => set("login_subtitle", e.target.value)} />
        </div>
        <button
          className="btn btn-primary"
          disabled={mutation.isPending}
          onClick={() => {
            setNotice("");
            mutation.mutate(form, { onSuccess: () => setNotice("Configuration enregistrée.") });
          }}
        >
          {mutation.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </Panel>
    </>
  );
}

function AuthSection() {
  const { query, mutation } = useAdminConfig();
  const cfg = query.data;
  if (query.isLoading || !cfg) return <Panel title="Authentification" icon="lock"><p className="muted">Chargement…</p></Panel>;

  const toggle = (patch: Partial<AdminSiteConfig>) => mutation.mutate(patch);
  const flagKey: Record<string, keyof AdminSiteConfig> = {
    google: "enable_google",
    github: "enable_github",
    microsoft: "enable_microsoft",
    saml: "enable_saml",
  };

  return (
    <>
      <Panel title="Méthodes de connexion" subtitle="Contrôlez ce qui est proposé sur l'écran de connexion" icon="lock">
        <div className="setting-row">
          <div className="switch-text">
            <b>Connexion par email / mot de passe</b>
            <span className="muted">Formulaire classique de connexion.</span>
          </div>
          <Switch checked={cfg.enable_email_login} onChange={(v) => toggle({ enable_email_login: v })} disabled={mutation.isPending} />
        </div>
        <div className="setting-row">
          <div className="switch-text">
            <b>Autoriser la création de compte</b>
            <span className="muted">Affiche le lien « Créer un compte ».</span>
          </div>
          <Switch checked={cfg.allow_registration} onChange={(v) => toggle({ allow_registration: v })} disabled={mutation.isPending} />
        </div>
      </Panel>

      <Panel title="Fournisseurs SSO" subtitle="Un bouton n'apparaît que s'il est activé ET configuré côté serveur" icon="shield">
        {cfg.providers.map((p) => {
          const key = flagKey[p.id];
          return (
            <div key={p.id} className="admin-provider">
              <div className="switch-text">
                <b>{p.label}</b>
                <span>
                  {p.configured ? (
                    <span className="cfg-badge ok"><Icon name="check" size={10} /> Configuré</span>
                  ) : (
                    <span className="cfg-badge missing"><Icon name="alert" size={10} /> Identifiants manquants</span>
                  )}
                </span>
              </div>
              <Switch
                checked={p.enabled}
                onChange={(v) => toggle({ [key]: v } as Partial<AdminSiteConfig>)}
                disabled={mutation.isPending}
              />
            </div>
          );
        })}
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          <Icon name="alert" size={12} /> Les identifiants (client ID / secret) se configurent
          côté serveur via l'administration Django (SocialApp). Tant qu'ils sont absents, le
          bouton reste masqué sur la page de connexion même s'il est activé ici.
        </p>
      </Panel>
    </>
  );
}

function AdminsSection() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: api.listAdminUsers });
  const [error, setError] = useState("");

  const m = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => api.setUserSystemAdmin(id, value),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: () => setError("Modification impossible."),
  });

  const users = usersQ.data ?? [];

  return (
    <Panel title="Administrateurs système" subtitle="Accordez ou retirez l'accès à cette console" icon="shield">
      {error && <p className="form-error">{error}</p>}
      {usersQ.isLoading && <p className="muted">Chargement…</p>}
      {users.map((u) => {
        const isSelf = u.id === user?.id;
        return (
          <div key={u.id} className="admin-provider">
            <div className="switch-text">
              <b>{u.display_name || u.email}</b>
              <span className="muted" style={{ fontSize: 11.5 }}>
                {u.email}
                {u.is_superuser && " · superuser"}
              </span>
            </div>
            <Switch
              checked={u.is_effective_admin}
              disabled={u.is_superuser || isSelf || m.isPending}
              onChange={(v) => { setError(""); m.mutate({ id: u.id, value: v }); }}
            />
          </div>
        );
      })}
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Les comptes « superuser » sont administrateurs de façon permanente. Vous ne pouvez pas
        retirer votre propre accès.
      </p>
    </Panel>
  );
}
