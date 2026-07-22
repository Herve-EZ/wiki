# 6. Historique & versions

[← Collaboration temps réel](05-collaboration-temps-reel.md) · [Retour au sommaire](README.md)

---

Chaque fois qu'une page est enregistrée, WikiCollab crée une **nouvelle version
immuable**. Vous pouvez donc **comparer** deux versions et **restaurer** un état
antérieur — sans jamais rien perdre.

---

## Ouvrir l'historique

Cliquez sur **« Historique »** dans la barre supérieure de la page. La fenêtre
**« Historique des versions »** s'ouvre.

Elle comporte deux volets : la **liste des versions** (à gauche) et le
**comparatif / diff** (à droite).

---

## La liste des versions

Chaque ligne affiche :

- le numéro **v1**, **v2**, … ;
- l'**auteur** de la version ;
- la **date et l'heure**.

La version la plus récente porte l'étiquette **« actuelle »**.

En haut : *« Sélectionnez 2 versions à comparer »*. Par défaut, si vous n'en
choisissez pas, l'application **compare automatiquement les deux plus récentes**.

---

## Comparer deux versions (diff)

1. Cliquez sur **deux versions** dans la liste (sélectionner une troisième remplace la sélection).
2. Le volet de droite affiche le comparatif **« Comparaison v[x] → v[y] »**, avec :
   - un compteur vert **+N** (lignes ajoutées) ;
   - un compteur rouge **−N** (lignes supprimées).
3. Le corps montre un **diff ligne à ligne** :
   - lignes **ajoutées** en vert (préfixe `+`) ;
   - lignes **supprimées** en rouge (préfixe `−`) ;
   - lignes de contexte neutres, avec les numéros de ligne avant/après.

---

## Restaurer une version

Si la restauration est possible (en ligne), un bouton **« Restaurer la v[x] »** est
proposé en bas du comparatif.

1. Sélectionnez la version à restaurer.
2. Cliquez sur **« Restaurer la v[x] »**.
3. La page revient à cet état et la fenêtre se ferme.

> **L'historique est immuable — la restauration *ajoute* une version, elle n'en
> supprime jamais.** Vous pouvez donc restaurer en toute confiance : si besoin, vous
> reviendrez tout aussi facilement à l'état d'avant la restauration.

---

## Points clés

- **Une version par enregistrement** — inutile de « sauvegarder manuellement » votre historique, il se construit tout seul.
- **Rien n'est jamais perdu** — même une restauration n'efface pas le passé.
- **L'auteur est tracé** — chaque version indique qui l'a produite.

[← Collaboration temps réel](05-collaboration-temps-reel.md) · [Retour au sommaire](README.md) · [Recherche →](07-recherche.md)
