import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";

const TOC: { id: string; label: string; icon: string }[] = [
  { id: "start", label: "Premiers pas", icon: "book" },
  { id: "roles", label: "Rôles & permissions", icon: "users" },
  { id: "invite", label: "Inviter", icon: "mail" },
  { id: "pages", label: "Rédiger des pages", icon: "file" },
  { id: "workflows", label: "Workflows", icon: "refresh" },
  { id: "search", label: "Recherche", icon: "search" },
  { id: "security", label: "Sécurité & 2FA", icon: "shield" },
  { id: "offline", label: "Hors-ligne & synchro", icon: "wifiOff" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Topic({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="panel-card help-topic">
      <div className="panel-title">
        <Icon name={icon} size={17} />
        <h4 style={{ margin: 0 }}>{title}</h4>
      </div>
      <div className="panel-body help-body">{children}</div>
    </section>
  );
}

export function HelpRoute() {
  const navigate = useNavigate();

  return (
    <div className="settings-page">
      <div className="help-hero">
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ alignSelf: "flex-start" }}>
          <Icon name="chevronDown" size={14} style={{ transform: "rotate(90deg)" }} /> Retour
        </button>
        <div className="help-hero-main">
          <span className="help-hero-badge"><Icon name="book" size={22} /></span>
          <div>
            <h2 style={{ margin: 0 }}>Bien démarrer avec WikiCollab</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Le wiki collaboratif temps-réel, self-hosted — vos données restent chez vous.
            </p>
          </div>
        </div>
      </div>

      <div className="settings-shell">
        <nav className="settings-nav help-toc">
          <div className="sb-label" style={{ padding: "2px 8px 6px" }}>Sommaire</div>
          {TOC.map((t) => (
            <button key={t.id} className="settings-nav-item" onClick={() => scrollTo(t.id)}>
              <Icon name={t.icon} size={15} />
              <span style={{ flex: 1 }}>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings-panel">
          <Topic id="start" icon="book" title="Premiers pas">
            <ol>
              <li><b>Créez un espace de travail</b> : menu des espaces (en haut de la barre latérale) → <i>Nouvel espace</i>. Vous en devenez automatiquement propriétaire.</li>
              <li><b>Créez une page</b> : bouton <i>Nouvelle page</i> sur l'accueil de l'espace, ou le <Icon name="plus" size={11} /> à côté du nom de l'espace.</li>
              <li><b>Invitez vos collaborateurs</b> : accueil de l'espace → <i>Inviter des collaborateurs</i>, ou <i>Réglages de l'espace → Membres</i>.</li>
            </ol>
          </Topic>

          <Topic id="roles" icon="users" title="Rôles & permissions">
            <table className="role-table">
              <thead>
                <tr><th>Action</th><th>Lecteur</th><th>Éditeur</th><th>Propriétaire</th></tr>
              </thead>
              <tbody>
                <tr><td>Lire les pages</td><td>✓</td><td>✓</td><td>✓</td></tr>
                <tr><td>Créer / modifier (brouillon)</td><td>—</td><td>✓</td><td>✓</td></tr>
                <tr><td>Publier / archiver</td><td>—</td><td>—</td><td>✓</td></tr>
                <tr><td>Supprimer une page</td><td>—</td><td>—</td><td>✓</td></tr>
                <tr><td>Gérer les membres</td><td>—</td><td>—</td><td>✓</td></tr>
                <tr><td>Réglages, workflows, suppression de l'espace</td><td>—</td><td>—</td><td>✓</td></tr>
              </tbody>
            </table>
            <p className="muted">Les permissions sont vérifiées côté serveur : masquer un bouton n'est qu'un confort d'interface.</p>
          </Topic>

          <Topic id="invite" icon="mail" title="Inviter des collaborateurs">
            <ul>
              <li>Seul le <b>propriétaire</b> invite : <i>Réglages de l'espace → Membres</i>, saisissez l'email et choisissez un rôle.</li>
              <li>La personne reçoit un <b>lien d'invitation par email</b> — même sans compte existant (elle pourra s'inscrire puis accepter).</li>
              <li>L'espace n'apparaît dans son interface <b>qu'après acceptation</b> (via le lien, ou dans <i>Paramètres → Invitations</i>).</li>
              <li>Le propriétaire peut révoquer une invitation, changer un rôle ou retirer un membre à tout moment.</li>
            </ul>
          </Topic>

          <Topic id="pages" icon="file" title="Rédiger des pages">
            <ul>
              <li>Cliquez sur une <b>section</b> pour l'éditer (Markdown). Les sections sont verrouillées pendant qu'un collègue les modifie — présence en temps réel.</li>
              <li>Cliquez sur le <b>titre</b> pour le renommer.</li>
              <li>Liez des pages avec <code>[[Titre de la page]]</code> — les pages liées apparaissent en bas.</li>
              <li>Chaque enregistrement crée une <b>version</b> : bouton historique pour comparer (diff) et restaurer.</li>
              <li>Statuts : <b>Brouillon → Publié → Archivé</b>. La publication est réservée au propriétaire.</li>
            </ul>
          </Topic>

          <Topic id="workflows" icon="refresh" title="Workflows de validation">
            <ul>
              <li>Le propriétaire définit des workflows dans <i>Réglages de l'espace → Workflows</i> (ex. Brouillon → Revue → Publié).</li>
              <li>Il assigne un workflow à une page ; un éditeur peut <i>faire avancer</i> les étapes intermédiaires.</li>
              <li>L'étape <b>finale</b> publie la page — seul le propriétaire peut la franchir.</li>
            </ul>
          </Topic>

          <Topic id="search" icon="search" title="Recherche">
            <p>Appuyez sur <span className="kbd">Ctrl</span> + <span className="kbd">K</span> (ou ⌘K) pour rechercher dans toutes les pages accessibles.</p>
          </Topic>

          <Topic id="security" icon="shield" title="Sécurité : 2FA & mot de passe">
            <ul>
              <li>Activez la <b>double authentification</b> dans <i>Paramètres → Sécurité</i> : scannez le QR code avec une app TOTP.</li>
              <li>Conservez vos <b>codes de récupération</b> : ils dépannent en cas de perte du téléphone.</li>
              <li>Un espace peut <b>exiger la 2FA</b> : sans second facteur, son contenu est inaccessible.</li>
              <li>Profil (nom, avatar) et mot de passe se modifient aussi dans <i>Paramètres</i>.</li>
            </ul>
          </Topic>

          <Topic id="offline" icon="wifiOff" title="Hors-ligne & synchronisation">
            <ul>
              <li>Les pages ouvertes sont mises en cache localement (application de bureau) : relecture et modification sans réseau.</li>
              <li>Activez <b>« Travailler hors-ligne »</b> dans <i>Paramètres → Synchronisation</i> pour forcer le mode déconnecté.</li>
              <li>Le bouton <b>Synchroniser</b> (bas de la barre latérale) envoie vos modifications et recharge les données ; la synchro se relance aussi automatiquement au retour du réseau.</li>
              <li>Si une page a été <b>supprimée sur le serveur</b>, un bandeau propose de la <i>supprimer</i> localement ou de la <i>recréer</i>.</li>
            </ul>
          </Topic>
        </div>
      </div>
    </div>
  );
}
