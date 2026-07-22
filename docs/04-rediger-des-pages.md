# 4. Rédiger des pages

[← Espaces de travail](03-espaces-de-travail.md) · [Retour au sommaire](README.md)

---

Les pages sont écrites en **Markdown** et découpées automatiquement en **sections**
éditables indépendamment. Ce découpage rend la collaboration fluide : plusieurs
personnes peuvent travailler sur la même page, chacune sur sa section.

---

## Créer une page

Points d'entrée : la carte **« Nouvelle page »** sur l'accueil de l'espace, ou le
bouton **+** à côté de **« Pages »** dans la barre latérale.

La fenêtre **« Nouvelle page »** s'ouvre :

1. **Titre** de la page (obligatoire).
2. **Slug** — généré automatiquement à partir du titre, modifiable manuellement.
3. (Optionnel) **« Importer un fichier Markdown »** — importez un `.md`, `.markdown`
   ou `.txt`. Si le titre est vide, il est déduit du premier titre `#` du fichier ou
   de son nom.
4. Cliquez sur **« Créer »** (ou **« Importer »** si un fichier a été chargé).

> Une page vierge démarre avec `# Titre`. En cas de slug déjà pris :
> *Un slug identique existe déjà dans cet espace.*

---

## Comprendre les sections

Le contenu est **automatiquement découpé en sections** à chaque titre de niveau 1 à 3
(`#`, `##`, `###`). Le texte avant le premier titre forme sa propre section.

Vous ne créez pas les sections à la main : elles apparaissent là où vous placez des
titres. C'est ce découpage qui permet les **verrous par section**
(voir [Collaboration temps réel](05-collaboration-temps-reel.md)).

---

## Modifier une page

### Le titre

Le titre est un champ éditable en haut de la page. Cliquez dedans, modifiez, puis
cliquez ailleurs : il est **enregistré automatiquement** en quittant le champ.

### Une section

1. Survolez la section : un bouton **« Éditer »** (icône engrenage) apparaît en bas
   de celle-ci (si vous avez les droits d'écriture et qu'elle n'est pas verrouillée
   par un collègue).
2. Cliquez sur **« Éditer »** : la section se transforme en **zone de texte** pré-remplie avec son Markdown. Une étiquette **« Vous éditez cette section »** s'affiche.
3. Une barre d'outils apparaît :
   - **« Enregistrer »** — enregistre la section.
   - **« Annuler »** — abandonne les modifications.
   - **« Mentionner »** — insère une mention @ (voir plus bas).
   - **« Lier une page »** — insère un lien vers une autre page.
4. Cliquez sur **« Enregistrer »** : la section est réintégrée et la page enregistrée.

> Une seule section peut être éditée à la fois. L'indicateur en haut passe par
> *Modifié* → *Enregistrement…* → *Enregistré*.

---

## Syntaxe Markdown prise en charge

- Titres `#`, `##`, `###` (et plus)
- **Gras**, *italique*, `code en ligne`
- Blocs de code, listes, citations `>`, tableaux
- Images, liens (les URL brutes deviennent cliquables automatiquement)
- Traits horizontaux `---`
- Corrections typographiques automatiques (guillemets « intelligents »)

> Le HTML brut est **désactivé** dans le rendu, pour des raisons de sécurité.

---

## Lier des pages entre elles (wikiliens)

Les **wikiliens** connectent les pages d'un même espace.

### Syntaxe

| Vous écrivez | Résultat |
|---|---|
| `[[Titre de la page]]` | lien vers la page dont le titre (ou slug) correspond |
| `[[slug\|Texte affiché]]` | lien vers `slug`, affiché « Texte affiché » |

La correspondance est **insensible à la casse** et se fait sur le titre **ou** le slug.

### Insérer un lien sans tout taper

1. En mode édition, cliquez sur **« Lier une page »**.
2. Un sélecteur s'ouvre (champ *Lier une page…*). Tapez pour filtrer.
3. Cliquez sur une page (ou **Entrée** pour la première, **Échap** pour fermer) :
   le wikilien est inséré au curseur. Si du texte était sélectionné, il devient le
   libellé du lien.

### Cliquer sur un wikilien en lecture

- **Page existante** → vous y êtes redirigé.
- **Page inexistante** (et vous pouvez écrire) → la fenêtre de création s'ouvre, pré-remplie avec le titre du lien.
- **Page inexistante** (lecture seule) → message *« … » n'existe pas encore.*

### Backlinks (« Lié à : »)

En bas de chaque page, la ligne **« Lié à : »** liste les pages qui **pointent vers**
la page courante, sous forme de puces cliquables. S'il n'y en a aucune :
*aucune page liée*.

---

## Mentionner un collègue (@)

1. En mode édition, cliquez sur **« Mentionner »**.
2. Un sélecteur s'ouvre (champ *Mentionner un membre…*). Filtrez par nom ou email.
3. Naviguez avec **↑/↓**, validez avec **Entrée** (**Échap** ferme).
4. La mention `@Nom` est insérée au curseur.

La personne mentionnée reçoit une **notification**
(voir [Notifications](09-notifications.md)).

---

## Statut d'une page : Brouillon → Publié → Archivé

En haut du corps de la page, un menu de **statut** :

- **Brouillon** — travail en cours.
- **Publié** — page validée *(réservé au propriétaire)*.
- **Archivé** — mise de côté *(réservé au propriétaire)*.

Les éditeurs voient et modifient le brouillon ; la **publication et l'archivage sont
réservés au propriétaire**. Un [workflow](08-workflows.md) peut structurer ce passage.

---

## Suivre une page

Cliquez sur **« Suivre »** (icône cloche) dans la barre d'actions de la page pour être
notifié à chaque modification. Le bouton devient **« Suivi »** ; recliquez pour ne
plus suivre.

---

## Supprimer une page

> Réservé au **propriétaire**.

Cliquez sur **« Supprimer »** dans la barre d'actions, puis **« Confirmer »**. La page
est supprimée et vous revenez à l'espace.

---

## Voir aussi

- [Collaboration temps réel](05-collaboration-temps-reel.md) — présence et verrous de section.
- [Historique & versions](06-historique-et-versions.md) — chaque enregistrement crée une version.
- [Export](11-export.md) — sortir une page en PDF, Word ou Markdown.

[← Espaces de travail](03-espaces-de-travail.md) · [Retour au sommaire](README.md) · [Collaboration temps réel →](05-collaboration-temps-reel.md)
