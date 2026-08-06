# F16 — Transclusion de blocs

[← Roadmap](ROADMAP.md) · **Livré en v0.9** · **Effort : M**

> ✅ Implémenté. Voir le [guide utilisateur](../04-rediger-des-pages.md#inclure-une-section-dune-autre-page-transclusion).

---

## Objectif & valeur

Supprimer la **duplication** de contenu entre pages. Un passage utile à plusieurs
endroits (prérequis d'accès, convention de nommage, procédure de secours) est écrit
**une fois** et **inclus** ailleurs : la page source reste l'unique vérité, et une
correction se propage partout instantanément.

Sans cela, une équipe copie-colle — puis les copies divergent en silence.

## Périmètre fonctionnel

- `![[slug]]` inclut toute une page ; `![[slug#section]]` inclut une section.
- Un sélecteur en deux temps (page → section) évite d'avoir à retenir la syntaxe et
  écrit la référence avec le **slug**, stable au renommage de la page source.
- En lecture, le bloc inclus est **encadré** et son en-tête renvoie à la page source.
- Le bloc inclus est **en lecture seule** : on édite depuis la page d'origine.
- À l'export (PDF / Word / Markdown), les inclusions sont **développées** pour que le
  document produit soit autonome.

## Conception technique

Aucun changement backend : une inclusion est du **Markdown**, donc déjà stockée et
versionnée avec la page. Tout se joue au rendu.

### Syntaxe et parsing

- `lib/transclude.ts` — la référence, sa clé de cache (`target#section`), le parsing
  des références d'un document, l'extraction d'une section et l'expansion pour
  l'export.
- Règle **de bloc** (`![[…]]` seul sur sa ligne) dans `lib/markdown.ts`, insérée avant
  `paragraph`. Une occurrence en milieu de phrase n'est donc pas une inclusion.
- `lib/wikilinks.ts` : la regex des wikiliens gagne un `(?<!!)` pour laisser passer
  `![[…]]` sans le transformer en image de lien.

### Résolution (asynchrone)

La page hôte ne contient que la référence : le corps à inclure vit dans une autre
page, qu'il faut charger.

- `hooks/useTransclusions.ts` résout les références de la page courante avec
  `useQueries`, sous la **même clé `["page", id]`** que le lecteur — une page déjà
  visitée est servie par le cache, et `loadPage` fait fonctionner les inclusions
  **hors-ligne** sur le desktop (miroir SQLite).
- La résolution se fait **une fois pour la page entière** (`PageRoute`), puis la carte
  résolue est passée aux sections via l'`env` de markdown-it.
- Les états non résolus sont **rendus explicitement** (page manquante, section
  renommée, cycle) plutôt que d'aboutir à un bloc vide.

### Garde-fous

- **Profondeur 1** : un bloc inclus ne s'inclut pas à son tour. La résolution ne
  porte que sur les références de la page hôte ; au-delà, le renderer affiche
  *« Inclusion imbriquée — non développée ici »*. Cela ferme la porte aux boucles
  sans machinerie de détection de cycle.
- L'auto-inclusion est détectée et signalée.

## Impacts

- **Modèle / endpoints** : aucun.
- **Frontend** : `lib/transclude.ts`, `hooks/useTransclusions.ts`,
  `components/editor/TransclusionPicker.tsx` (nouveaux) ; `lib/markdown.ts`,
  `lib/wikilinks.ts`, `MarkdownEditor`, `SectionBlock`, `PageRoute`, `PageActions`.
- **UI** : bouton de barre d'outils + entrée du menu `/`, cadre `.transclusion`.

## Dépendances

Wikiliens et découpage en sections (v0.8) — les ancres de section réutilisent le
`slugify` de `lib/sections.ts`, ce qui garantit que les slugs du sélecteur
correspondent à ceux du sommaire.

## Risques & limites assumées

- **Renommer un titre de section casse la référence** — l'ancre est le slug du titre.
  Le cadre l'annonce (*n'a pas de section « … »*) au lieu de disparaître. Une
  résolution par identifiant stable de section serait plus robuste, mais demanderait
  de stocker des ancres dans le Markdown : refusé, cela nuirait à la portabilité.
- **Pas d'inclusion inter-espaces** : la résolution passe par l'index des pages de
  l'espace courant. Volontaire — cela éviterait de contourner les permissions.
- Le rendu recalcule les blocs inclus à chaque frappe de la page hôte ; le coût est
  négligeable (quelques inclusions par page) et le HTML identique n'entraîne pas de
  mise à jour du DOM.

## Critères d'acceptation

- [x] `![[page]]` et `![[page#section]]` sont rendus avec un cadre et un lien source.
- [x] Le sélecteur insère la référence par slug (page entière ou section).
- [x] Une référence invalide affiche un message explicite (page, section, cycle).
- [x] Une inclusion imbriquée n'est pas développée et le signale.
- [x] Les wikiliens, images, tableaux, Mermaid et listes de tâches ne régressent pas.
- [x] Les exports PDF / Word / Markdown contiennent le contenu inclus.
