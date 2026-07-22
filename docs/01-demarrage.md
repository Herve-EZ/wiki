# 1. Démarrage & première connexion

[← Retour au sommaire](README.md)

---

## Qu'est-ce que WikiCollab ?

WikiCollab est un **wiki collaboratif temps réel** pensé pour les équipes. Vous y
rédigez des pages en Markdown, organisées par **espaces de travail**, avec :

- la **présence en direct** — vous voyez qui consulte ou édite une page ;
- des **verrous de section** — deux personnes ne s'écrasent jamais ;
- un **historique versionné** — chaque enregistrement crée une version comparable et restaurable ;
- un **mode hors-ligne** (application de bureau) — vous continuez à travailler sans réseau, tout se synchronise au retour ;
- de l'**auto-hébergement** — l'instance tourne chez vous, vos données ne partent nulle part.

## Deux façons d'utiliser l'application

| | Application de bureau | Application web |
|---|---|---|
| Plateformes | Windows, macOS, Linux | Tout navigateur récent |
| Mode hors-ligne complet | ✓ | — (en ligne uniquement) |
| Cache local (SQLite) | ✓ | — |
| Notifications système | ✓ | notifications dans l'app |
| Mises à jour automatiques | ✓ | rechargez la page |

Le reste des fonctionnalités (édition, temps réel, historique, recherche…) est
identique sur les deux versions.

---

## Installer l'application de bureau

1. Ouvrez la page des **releases** de votre instance (ou du dépôt GitHub).
2. Téléchargez le paquet correspondant à votre système :
   - **Windows** : `.msi` ou `.exe`
   - **macOS** : `.dmg`
   - **Linux** : `.AppImage` ou `.deb`
3. Installez, puis lancez **WikiCollab**.

> L'application se met ensuite **à jour toute seule** : elle vérifie les nouvelles
> versions au démarrage et vous propose de les installer. Voir
> [Application de bureau](12-application-bureau.md).

## Utiliser la version web

Ouvrez simplement l'URL de votre instance dans un navigateur, puis connectez-vous.
Aucune installation n'est nécessaire.

---

## Première connexion

À l'ouverture, l'écran de **connexion** s'affiche : une carte centrée avec le logo
et le nom de votre instance. Les méthodes disponibles dépendent de la configuration
décidée par votre administrateur (voir [Administration](13-administration.md)).

### Avec un email et un mot de passe

1. Saisissez votre **Adresse email** et votre **Mot de passe**.
2. Cliquez sur **« Se connecter »**.

Si votre compte est protégé par la double authentification, un écran de
**vérification en deux étapes** apparaît ensuite — voir
[Compte & sécurité](02-compte-et-securite.md).

### Avec un fournisseur SSO (Google, GitHub, Microsoft, SAML)

Si votre administrateur a activé le SSO, des boutons apparaissent sous un séparateur
**« ou continuer avec »**. Cliquez sur votre fournisseur : la page de connexion
s'ouvre dans votre navigateur, puis vous êtes ramené automatiquement dans
l'application, connecté.

### Créer un compte

Si la création de compte est autorisée, un lien **« Créer un compte »** figure sur
l'écran de connexion.

1. Cliquez sur **« Créer un compte »**.
2. Renseignez **Nom affiché**, **Adresse email** et **Mot de passe**
   (**8 caractères minimum**).
3. Cliquez sur **« Créer mon compte »** — vous êtes connecté immédiatement.

> Un lien **« J'ai déjà un compte — me connecter »** permet de revenir en arrière.

---

## Après la connexion : l'écran d'accueil

### Vous n'appartenez à aucun espace

Un écran de bienvenue s'affiche : *« Bienvenue 👋 — Vous n'appartenez encore à aucun
espace de travail. Créez le vôtre, ou acceptez une invitation. »*

Vous pouvez alors :

- **Créer mon espace de travail** — vous en devenez automatiquement propriétaire ;
- **Accepter / Refuser** les invitations en attente affichées en dessous ;
- accéder à l'**Aide**, aux **Paramètres** ou vous **déconnecter** depuis le pied de page.

Voir [Espaces de travail](03-espaces-de-travail.md).

### Vous avez déjà un espace

Vous arrivez directement sur l'**accueil de votre premier espace**, avec :

- la **barre latérale** à gauche (sélecteur d'espace, liste des pages, profil, actions) ;
- des **cartes d'action rapide** (nouvelle page, inviter, réglages, aide) ;
- la liste des **pages récentes**.

---

## Anatomie de l'interface

**Barre latérale (à gauche)**, de haut en bas :

- **Sélecteur d'espace** — nom de l'espace courant + votre rôle ; ouvre la liste de tous vos espaces et **« Nouvel espace »**.
- **Accueil** de l'espace.
- (Propriétaires) **Inviter des membres** et **Réglages de l'espace**.
- **Pages** — la liste des pages, avec un bouton **+** pour en créer une. Une pastille **« MàJ »** signale une page modifiée en temps réel par quelqu'un d'autre.
- **Bouton de synchronisation** (état : *À jour*, *En attente*, *À résoudre*, *Hors-ligne*).
- **Pied de page** : votre carte de profil, la **cloche de notifications**, le **thème**, l'accès **Administration** (si admin), l'**Aide**, les **Paramètres** et **Se déconnecter**.

**Barre supérieure (sur une page)** :

- Fil d'Ariane : *Espace / Titre de la page*.
- Indicateur d'enregistrement : *Enregistrement…* / *Enregistré* / *Modifié*.
- Bouton **Rechercher** (raccourci **Ctrl + K**), avatars des personnes présentes, bouton **Historique**.

---

## Changer de thème

Un bouton dans le pied de la barre latérale fait défiler trois modes à chaque clic :

- ☀️ **Thème clair**
- 🌙 **Thème sombre**
- 🖥️ **Thème système** (suit le réglage de votre système d'exploitation)

Votre choix est mémorisé sur l'appareil.

---

## Et ensuite ?

- Sécurisez votre compte → [Compte & sécurité](02-compte-et-securite.md)
- Montez votre équipe → [Espaces de travail](03-espaces-de-travail.md)
- Écrivez votre première page → [Rédiger des pages](04-rediger-des-pages.md)

[← Retour au sommaire](README.md) · [Compte & sécurité →](02-compte-et-securite.md)
