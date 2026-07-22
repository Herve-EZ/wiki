# 11. Export (PDF, Word, Markdown)

[← Hors-ligne & synchronisation](10-hors-ligne-et-synchro.md) · [Retour au sommaire](README.md)

---

Vous pouvez sortir n'importe quelle page dans trois formats, directement depuis
l'application. Tous fonctionnent **sans connexion** et **sans dépendance externe** —
la conversion se fait sur votre appareil.

---

## Exporter une page

1. Ouvrez la page.
2. Dans la barre d'actions, cliquez sur **« Exporter »** (icône de téléchargement).
3. Choisissez un format dans le menu :

| Option | Format | Détail |
|---|---|---|
| **PDF (impression)** | `.pdf` | Ouvre la **boîte d'impression** du système ; choisissez *Enregistrer au format PDF*. |
| **Word (.docx)** | `.docx` | Génère un vrai document Word et propose de l'enregistrer sous `slug.docx`. |
| **Markdown (.md)** | `.md` | Enregistre le Markdown brut sous `slug.md`. |

> Sur l'application de bureau, le menu natif **Fichier → Exporter la page…** ouvre le
> même menu d'export.

---

## Détail des formats

### PDF (impression)

La page est mise en forme sur un gabarit A4, puis la **boîte d'impression** de votre
système s'ouvre. Sélectionnez *« Enregistrer au format PDF »* (ou imprimez directement).
Aucune dépendance, fonctionne hors-ligne.

### Word (.docx)

Un document `.docx` est produit sur votre appareil, en conservant : titres,
paragraphes, **gras**/*italique*/`code`, liens, listes, citations, blocs de code,
**tableaux** (avec en-têtes et alignement) et traits horizontaux. Vous êtes invité à
l'enregistrer.

> Les **images** sont exportées sous forme de texte alternatif dans le `.docx` (le PDF,
> lui, les affiche). En cas d'échec : *Échec de l'export Word.*

### Markdown (.md)

Le contenu Markdown brut de la page est enregistré tel quel — pratique pour
sauvegarder, versionner ailleurs ou réimporter.

> En cas d'échec : *Échec de l'export Markdown.*

---

## Où le fichier est-il enregistré ?

- **Application de bureau** : une **boîte de dialogue « Enregistrer »** native vous
  laisse choisir l'emplacement.
- **Web** : le fichier est **téléchargé** par le navigateur (dossier de téléchargements).

---

## Importer du Markdown

L'export a son pendant à l'import : à la création d'une page, le bouton
**« Importer un fichier Markdown »** charge un `.md`, `.markdown` ou `.txt`
(voir [Rédiger des pages](04-rediger-des-pages.md#créer-une-page)).

[← Hors-ligne & synchronisation](10-hors-ligne-et-synchro.md) · [Retour au sommaire](README.md) · [Application de bureau →](12-application-bureau.md)
