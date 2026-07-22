# 3. Espaces de travail, rôles & membres

[← Compte & sécurité](02-compte-et-securite.md) · [Retour au sommaire](README.md)

---

Un **espace de travail** regroupe des pages et une équipe. Chaque personne y a un
**rôle** qui détermine ce qu'elle peut faire.

---

## Créer un espace

Deux points d'entrée :

- Sur l'écran de bienvenue : **« Créer mon espace de travail »**.
- Depuis le **sélecteur d'espace** (en haut de la barre latérale) → **« Nouvel espace »**.

La fenêtre **« Nouvel espace de travail »** s'ouvre :

1. **Nom** de l'espace.
2. **Slug** — généré automatiquement à partir du nom (identifiant court dans l'URL). Modifiable manuellement ; il doit être unique.
3. **Visibilité** :
   - **Privé (membres invités)** — accessible aux seuls membres invités.
   - **Sur invitation** — l'accès se fait par invitation.
   - **Public (lecture ouverte)** — lecture ouverte.
4. Case **« Exiger la double authentification (2FA) pour accéder »** — si cochée, seuls les membres ayant activé la 2FA peuvent entrer.
5. Cliquez sur **« Créer l'espace »**.

Vous en devenez automatiquement le **propriétaire**.

---

## Les rôles

| Action | Lecteur | Éditeur | Propriétaire |
|---|:---:|:---:|:---:|
| Lire les pages | ✓ | ✓ | ✓ |
| Créer / modifier (brouillon) | — | ✓ | ✓ |
| Publier / archiver une page | — | — | ✓ |
| Supprimer une page | — | — | ✓ |
| Gérer les membres | — | — | ✓ |
| Réglages, workflows, suppression de l'espace | — | — | ✓ |

> Les permissions sont **vérifiées côté serveur**. Même si un bouton reste visible,
> une action non autorisée sera refusée (message *Action non autorisée par votre rôle.*).

---

## Inviter des collaborateurs

> Seul le **propriétaire** peut inviter.

1. Ouvrez **Réglages de l'espace → Membres** (barre latérale, ou carte *Inviter des collaborateurs* sur l'accueil).
2. Dans la section **Inviter** :
   - saisissez l'**Adresse email** (ex. `collaborateur@exemple.com`) ;
   - choisissez un **rôle** (par défaut *Lecteur*) ;
   - cliquez sur **« Inviter »**.
3. Un message confirme : *Invitation envoyée à …*

La personne reçoit un **lien d'invitation par email** — même si elle n'a pas encore
de compte : elle pourra s'inscrire, puis accepter.

### Côté invité : accepter une invitation

L'invité peut accepter de deux manières :

- **Via le lien reçu** — il arrive sur la page *« Invitation à collaborer »* et clique sur **« Accepter l'invitation »** (ou **« Refuser »**).
- **Depuis l'application** — *Paramètres → Invitations*, ou l'écran de bienvenue, listent les invitations en attente avec des boutons **Accepter** / **Refuser**.

> L'espace n'apparaît dans l'interface de l'invité **qu'après acceptation**.
> Si l'invitation a été envoyée à une autre adresse que celle du compte connecté,
> l'acceptation est refusée (*Cette invitation a été envoyée à une autre adresse email.*).

---

## Gérer les membres

**Réglages de l'espace → Membres** (propriétaire uniquement) :

- **Liste des membres** — chaque ligne affiche le nom, l'email et un menu de rôle.
  - **Changer un rôle** : sélectionnez le nouveau rôle dans le menu (enregistré immédiatement).
  - **Retirer un membre** : cliquez sur l'icône **✕** (*Retirer*).
- **Invitations en attente** — chaque invitation peut être **révoquée** via le bouton **« Révoquer »**.

---

## Réglages de l'espace

**Réglages de l'espace → Général** (propriétaire uniquement). La fenêtre est
intitulée *Réglages · [nom de l'espace]* et comporte trois onglets :
**Général**, **Membres**, **Workflows**.

Onglet **Général** :

- **Nom** de l'espace.
- **Visibilité** : *Privé (membres invités)* / *Sur invitation* / *Public (lecture ouverte)*.
- Case **« Exiger la double authentification (2FA) pour accéder »**.
- **« Enregistrer »** (message *Réglages enregistrés.*).

### Zone dangereuse — supprimer l'espace

En bas de l'onglet Général, la **« Zone dangereuse »** contient le bouton
**« Supprimer cet espace »**.

> ⚠️ *La suppression d'un espace efface toutes ses pages. Action irréversible.*

Un clic demande une confirmation (**« Confirmer la suppression »**).

---

## Changer d'espace

Cliquez sur le **sélecteur d'espace** en haut de la barre latérale : la liste de tous
vos espaces s'ouvre (une coche marque l'espace courant). Sélectionnez-en un autre, ou
créez-en un nouveau avec **« Nouvel espace »**.

---

## Voir aussi

- [Workflows de validation](08-workflows.md) — le troisième onglet des réglages.
- [Compte & sécurité](02-compte-et-securite.md) — activer la 2FA exigée par un espace.

[← Compte & sécurité](02-compte-et-securite.md) · [Retour au sommaire](README.md) · [Rédiger des pages →](04-rediger-des-pages.md)
