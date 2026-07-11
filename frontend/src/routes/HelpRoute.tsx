import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ maxWidth: "none" }}>
      <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name={icon} size={16} style={{ color: "var(--accent)" }} /> {title}
      </h4>
      <div className="help-body">{children}</div>
    </div>
  );
}

export function HelpRoute() {
  const navigate = useNavigate();

  return (
    <div className="settings-page">
      <div className="settings-head">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <Icon name="chevronDown" size={14} style={{ transform: "rotate(90deg)" }} /> Retour
        </button>
        <h3 style={{ margin: 0 }}>Aide — bien démarrer avec WikiCollab</h3>
      </div>

      <div className="settings-grid">
        <Section icon="book" title="Premiers pas">
          <ol>
            <li><b>Créez un espace de travail</b> : menu des espaces (en haut de la barre latérale) → <i>Nouvel espace</i>. Vous en devenez automatiquement propriétaire.</li>
            <li><b>Créez une page</b> : bouton <i>Nouvelle page</i> sur l'accueil de l'espace, ou le <Icon name="plus" size={11} /> à côté du nom de l'espace dans la barre latérale.</li>
            <li><b>Invitez vos collaborateurs</b> : accueil de l'espace → <i>Inviter des collaborateurs</i>, ou <i>Réglages de l'espace → Membres</i>.</li>
          </ol>
        </Section>

        <Section icon="users" title="Rôles et permissions">
          <table className="role-table">
            <thead>
              <tr><th>Action</th><th>Lecteur</th><th>Éditeur</th><th>Propriétaire</th></tr>
            </thead>
            <tbody>
              <tr><td>Lire les pages</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>Créer / modifier des pages (brouillon)</td><td>—</td><td>✓</td><td>✓</td></tr>
              <tr><td>Publier / archiver une page</td><td>—</td><td>—</td><td>✓</td></tr>
              <tr><td>Supprimer une page</td><td>—</td><td>—</td><td>✓</td></tr>
              <tr><td>Inviter / gérer les membres</td><td>—</td><td>—</td><td>✓</td></tr>
              <tr><td>Réglages / suppression de l'espace, workflows</td><td>—</td><td>—</td><td>✓</td></tr>
            </tbody>
          </table>
          <p className="muted">Les permissions sont vérifiées côté serveur : masquer un bouton n'est qu'un confort d'interface.</p>
        </Section>

        <Section icon="users" title="Inviter des collaborateurs">
          <ul>
            <li>Seul le <b>propriétaire</b> invite : <i>Réglages de l'espace → Membres</i>, saisissez l'email et choisissez un rôle.</li>
            <li>La personne reçoit un <b>lien d'invitation par email</b> — même si elle n'a pas encore de compte (elle pourra s'inscrire puis accepter).</li>
            <li>L'espace n'apparaît dans son interface <b>qu'après acceptation</b> (via le lien, ou dans <i>Paramètres → Invitations en attente</i>).</li>
            <li>Le propriétaire peut révoquer une invitation, changer le rôle d'un membre ou le retirer à tout moment.</li>
          </ul>
        </Section>

        <Section icon="file" title="Rédiger des pages">
          <ul>
            <li>Cliquez sur une <b>section</b> pour l'éditer (Markdown). Les sections sont verrouillées pendant qu'un collègue les modifie — vous voyez sa présence en temps réel.</li>
            <li>Cliquez sur le <b>titre</b> pour le renommer.</li>
            <li>Liez des pages entre elles avec <code>[[Titre de la page]]</code> — les pages liées apparaissent en bas.</li>
            <li>Chaque enregistrement crée une <b>version</b> : bouton historique pour comparer (diff) et restaurer.</li>
            <li>Statuts : <b>Brouillon → Publié → Archivé</b>. La publication est réservée au propriétaire.</li>
          </ul>
        </Section>

        <Section icon="refresh" title="Workflows de validation">
          <ul>
            <li>Le propriétaire définit des workflows dans <i>Réglages de l'espace → Workflows</i> (ex. Brouillon → Revue → Publié).</li>
            <li>Il assigne un workflow à une page ; chacun (éditeur) peut <i>faire avancer</i> les étapes intermédiaires.</li>
            <li>L'étape <b>finale</b> publie la page — seul le propriétaire peut la franchir.</li>
          </ul>
        </Section>

        <Section icon="search" title="Recherche">
          <p>Appuyez sur <span className="kbd">Ctrl</span> + <span className="kbd">K</span> (ou ⌘K) pour rechercher dans toutes les pages accessibles.</p>
        </Section>

        <Section icon="lock" title="Sécurité : 2FA et mot de passe">
          <ul>
            <li>Activez la <b>double authentification</b> dans <i>Paramètres</i> (icône <Icon name="settings" size={11} /> en bas de la barre latérale) : scannez le QR code avec une app TOTP (Google Authenticator, Authy…).</li>
            <li>Conservez vos <b>codes de récupération</b> : ils permettent de vous connecter si vous perdez votre téléphone.</li>
            <li>Un espace peut <b>exiger la 2FA</b> : sans second facteur, son contenu est inaccessible.</li>
            <li>Changement de mot de passe et profil (nom, avatar) : également dans <i>Paramètres</i>.</li>
          </ul>
        </Section>

        <Section icon="wifiOff" title="Mode hors-ligne (application de bureau)">
          <ul>
            <li>Les pages ouvertes sont mises en cache localement : vous pouvez les relire et les modifier sans réseau.</li>
            <li>Au retour du réseau, vos modifications sont <b>synchronisées automatiquement</b>.</li>
            <li>Si une page a été <b>supprimée sur le serveur</b> entre-temps, un bandeau vous propose de la <i>supprimer</i> localement ou de la <i>recréer</i> à partir de votre copie.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
