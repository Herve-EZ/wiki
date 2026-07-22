# 5. Collaboration en temps réel

[← Rédiger des pages](04-rediger-des-pages.md) · [Retour au sommaire](README.md)

---

WikiCollab est **collaboratif en direct** : quand vous ouvrez une page, l'application
établit une connexion temps réel qui vous montre qui est là et empêche deux personnes
d'écraser leurs modifications.

> La collaboration temps réel nécessite une **connexion**. Hors-ligne, l'application
> passe en **mode dégradé** (voir [Hors-ligne & synchronisation](10-hors-ligne-et-synchro.md)).

---

## La présence : qui est sur la page ?

Deux endroits vous indiquent la présence :

### Dans la barre supérieure

Une pile d'**avatars** apparaît à droite (jusqu'à 4 personnes affichées), à côté de
la recherche et du bouton *Historique*. Chaque avatar montre la photo (ou une image
générée) et le nom de la personne présente.

> La présence est **par personne**, pas par onglet : si vous ouvrez la page dans
> plusieurs onglets, vous n'apparaissez qu'une fois.

### La barre de présence (bas de page)

Un bandeau fin avec une pastille verte « en direct » et un décompte :

| Situation | Texte affiché |
|---|---|
| D'autres personnes sont là | *N personnes sur cette page* |
| Vous êtes seul | *Vous êtes seul sur cette page* |
| Hors-ligne / mode dégradé | ⚠️ *Temps réel indisponible — mode dégradé* |

Si des sections sont verrouillées, un badge à droite indique
*N section(s) verrouillée(s)*.

---

## Les verrous de section

Pour éviter les écrasements, l'édition se fait **section par section**, et chaque
section est **verrouillée** pendant qu'on la modifie. Plusieurs personnes peuvent donc
éditer **différentes sections** de la même page en même temps.

### Les trois états d'une section

| État | Ce que vous voyez |
|---|---|
| **Libre** | Section normale ; le bouton **« Éditer »** apparaît au survol (si vous avez les droits). |
| **Éditée par vous** | Surbrillance + étiquette verte **« Vous éditez cette section »**. |
| **Éditée par un collègue** | Surbrillance + étiquette **« [Nom] édite cette section »** ; le bouton *Éditer* n'apparaît pas. |

### Comment ça marche

- Cliquer sur **« Éditer »** **acquiert le verrou** ; **Enregistrer** ou **Annuler** le **libère**.
- Si vous tentez d'éditer une section déjà prise, un message s'affiche :
  *Section verrouillée par [Nom]*.
- Un verrou **abandonné** (personne ne l'a libéré) **expire automatiquement** au bout
  d'un moment, ce qui rend la section de nouveau disponible. Un verrou est aussi
  libéré si la personne se déconnecte.

---

## Mises à jour en direct

- Quand un collègue modifie une page **liée** à celle que vous consultez, un message
  discret apparaît : *« [Titre] » — page liée mise à jour*.
- Dans la barre latérale, une page modifiée en temps réel par quelqu'un d'autre reçoit
  une pastille **« MàJ »**.

---

## Reconnexion automatique

Si le réseau a un hoquet, la connexion temps réel se **rétablit toute seule**
(nouvelles tentatives espacées progressivement). La présence se met à jour dès le
retour. Un signal de vie (*heartbeat*) est envoyé régulièrement pour garder la
présence exacte.

---

## Commentaires

Chaque page a un fil de **commentaires** pour discuter sans modifier le contenu.

### Ouvrir les commentaires

Cliquez sur **« Commentaires »** dans la barre supérieure. Un **panneau latéral**
s'ouvre à droite. Le bouton affiche un **badge** avec le nombre de commentaires non
résolus.

### Commenter

1. En bas du panneau, saisissez votre message.
2. (Optionnel) choisissez la **section concernée** dans le menu (sinon *Commentaire
   général*).
3. Cliquez sur **« Commenter »**.

Chaque commentaire indique son auteur, l'heure, et éventuellement la **section** visée
(**§ Titre**).

### Répondre, résoudre, supprimer

- **Répondre** — ouvre un champ de réponse (un niveau de fil).
- **Résoudre / Rouvrir** — marque la discussion comme traitée (auteur ou éditeur/propriétaire).
  Les commentaires résolus sont **masqués** par défaut ; cochez **« Afficher les
  résolus »** pour les revoir.
- **Supprimer** — l'auteur, ou le propriétaire de l'espace.

> Tout membre ayant accès à la page peut commenter.

---

## Bonnes pratiques

- **Découpez vos pages en sections** (titres `##`) : plus il y a de sections, plus
  vous pouvez travailler en parallèle sans vous bloquer.
- **Utilisez les commentaires** pour les questions et relectures, plutôt que d'écrire
  dans le contenu.
- **Enregistrez ou annulez** dès que vous avez fini une section, pour libérer le
  verrou au plus vite.
- Un collègue est bloqué par un verrou que vous avez oublié ? Il suffit d'enregistrer
  ou d'annuler — sinon le verrou expirera de lui-même.

[← Rédiger des pages](04-rediger-des-pages.md) · [Retour au sommaire](README.md) · [Historique & versions →](06-historique-et-versions.md)
