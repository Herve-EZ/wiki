# 13. Administration système

[← Application de bureau](12-application-bureau.md) · [Retour au sommaire](README.md)

---

La console d'**administration système** permet de personnaliser l'instance (marque,
méthodes de connexion, SMTP) et de gérer les administrateurs.

> Réservée aux **administrateurs système**. Les autres utilisateurs sont redirigés
> vers l'accueil. On y accède par l'icône **bouclier** dans le pied de la barre
> latérale (ou l'écran de bienvenue), qui mène à **« Administration système »**.

La console comporte quatre onglets : **Marque & apparence**, **Authentification**,
**E-mail / SMTP**, **Administrateurs**.

---

## Marque & apparence

Personnalise l'identité visible partout dans l'application (les changements se
propagent immédiatement). Trois cartes, un bouton **« Enregistrer les modifications »**.

### Identité

- **Nom de l'application**
- **Accroche** (tagline)
- **Email de support** (optionnel)
- **Logo (markup SVG)** — collez un `<svg>…</svg>` complet, ou laissez vide pour le
  logo par défaut. Un aperçu est affiché.

### Couleurs

- **Accent — thème clair** (par défaut `#534ab7`)
- **Accent — thème sombre** (par défaut `#8b84e8`)

Le mode sombre utilise automatiquement l'accent sombre.

### Page de connexion

- **Titre** (vide → *« Connexion à [nom] »*)
- **Sous-titre** (vide → l'accroche)

---

## Authentification

### Méthodes de connexion

- **Connexion par email / mot de passe** — active/désactive le formulaire classique.
- **Autoriser la création de compte** — affiche ou masque le lien *« Créer un compte »*.

### Fournisseurs SSO

Une ligne par fournisseur (**Google**, **GitHub**, **Microsoft**, **SAML**), avec un
badge d'état et un interrupteur :

- **Configuré** (vert) — identifiants présents côté serveur.
- **Identifiants manquants** (rouge) — le bouton restera masqué sur l'écran de connexion.

> Un bouton SSO n'apparaît que s'il est **activé ici ET configuré côté serveur**. Les
> identifiants (client ID / secret) se règlent dans l'administration Django
> (*SocialApp*). Tant qu'ils sont absents, activer le fournisseur ici ne suffit pas.

---

## E-mail / SMTP

Configure le serveur d'envoi (invitations, notifications) :

- **« Activer la configuration SMTP personnalisée »** — désactivé, les variables
  d'environnement `EMAIL_*` sont utilisées.
- Champs : **Serveur SMTP** (hôte), **Port** (587 par défaut), **Adresse
  d'expéditeur**, **Utilisateur**, **Mot de passe** (laisser vide conserve l'existant).
- **TLS (STARTTLS)** et **SSL (connexion implicite)** — mutuellement exclusifs.
- **« Enregistrer »** et **« Envoyer un e-mail de test »** (le résultat s'affiche).

---

## Administrateurs

Liste tous les utilisateurs (nom, email, mention *· superuser* le cas échéant), avec
un interrupteur d'accès admin par ligne.

> Les comptes **superuser** sont administrateurs de façon permanente. Vous **ne pouvez
> pas retirer votre propre accès**.

---

## Notes pour l'administrateur d'instance

- La configuration de marque, les couleurs et le favicon sont appliqués **en direct** à toute l'interface.
- Les valeurs par défaut avant configuration : nom *WikiCollab*, accents `#534ab7` / `#8b84e8`, connexion email activée, création de compte autorisée, aucun bouton SSO.
- Pour le déploiement (Docker, seed de démonstration, variables d'environnement), reportez-vous au `README.md` technique du dépôt.

[← Application de bureau](12-application-bureau.md) · [Retour au sommaire](README.md) · [FAQ & dépannage →](14-faq-et-depannage.md)
