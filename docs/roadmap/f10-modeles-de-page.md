# F10 — Modèles de page (templates)

[← Roadmap](ROADMAP.md) · **Livré en v0.9** · **Effort : M**

> ✅ Implémenté. Voir le [guide utilisateur](../04-rediger-des-pages.md#modèles-de-page).

---

## Objectif & valeur

Accélérer et **standardiser** la création de contenu : compte-rendu de réunion,
ADR (Architecture Decision Record), runbook, spécification… Un modèle capture une
structure Markdown réutilisable (titres, sections, tableaux, checklists).

- Créer une page « à partir d'un modèle » plutôt que d'une page vierge.
- Uniformiser la documentation d'une équipe.

## Périmètre fonctionnel

- Le **propriétaire** gère les modèles de l'espace : *Réglages de l'espace → Modèles*
  (créer, éditer le contenu Markdown, renommer, supprimer).
- À la création d'une page (`NewPageModal`), un choix : **Page vierge** / **Depuis un
  fichier** / **Depuis un modèle** (liste déroulante des modèles de l'espace).
- Le contenu du modèle pré-remplit la nouvelle page ; le titre reste saisi par l'utilisateur.
- (Option) **Variables** simples remplacées à l'instanciation : `{{date}}`, `{{auteur}}`, `{{titre}}`.

## Conception technique

### Backend
- Modèle `PageTemplate(workspace, name, content_md, created_by, updated_at)`.
- Endpoints :
  - `GET/POST /api/workspaces/{slug}/templates/` (lecture : membres ; écriture : owner).
  - `GET/PATCH/DELETE /api/templates/{id}/` (owner).
- Réutiliser la logique de création de page existante : le front envoie `content_md`
  déjà rempli — **pas de couplage** serveur entre template et page (le modèle sert de source).
- (Option variables) résolues **côté client** au moment de l'instanciation.

### Frontend
- `WorkspaceSettingsModal` : nouvel onglet **Modèles** (liste + éditeur Markdown réutilisant `MarkdownEditor`).
- `NewPageModal` : sélecteur « Depuis un modèle » ; au choix, charge `content_md` du modèle et le place dans la page créée.
- Types : `PageTemplate`.

### Hors-ligne
- Les modèles sont chargés en ligne ; l'instanciation offline peut se faire depuis le cache react-query si présent. Non prioritaire.

## Impacts
- **Modèle** : `PageTemplate` (+ migration).
- **Endpoints** : templates CRUD.
- **UI** : onglet Réglages, option dans NewPageModal.

## Effort & découpage
1. Backend `PageTemplate` + endpoints + tests (M/2).
2. Front onglet Modèles (CRUD via MarkdownEditor).
3. Front intégration NewPageModal (+ variables optionnelles).

## Dépendances
Éditeur v0.8 (`MarkdownEditor`) pour l'édition des modèles. Onglets `WorkspaceSettingsModal` (existants).

## Décisions prises à l'implémentation
- **Variables** : périmètre minimal retenu (`{{titre}}`, `{{date}}`, `{{auteur}}`),
  substituées côté client à l'instanciation. Le modèle stocké garde ses variables.
- **Modèles intégrés** : en plus des modèles d'espace, quatre modèles sont livrés
  en dur côté front (`lib/templates.ts`) — runbook, ADR, post-mortem, onboarding.
  Ils sont disponibles dans tous les espaces sans configuration, y compris
  hors-ligne (les modèles d'espace, eux, nécessitent le réseau).
- **Édition du contenu** : `<textarea>` monospace dans l'onglet Réglages plutôt que
  `MarkdownEditor` — un modèle contient des variables et des structures vides, la
  barre d'outils et le menu `/` n'y apportent rien.
- Modèles **globaux** (instance) : hors périmètre, toujours.

## Critères d'acceptation
- [x] Le propriétaire crée un modèle avec du contenu Markdown.
- [x] Créer une page « depuis un modèle » pré-remplit le contenu.
- [x] Les variables `{{date}}`/`{{titre}}`/`{{auteur}}` sont substituées.
- [x] Écriture des modèles réservée au propriétaire (vérifié serveur).
- [x] Tests backend : CRUD + permissions (`pages/tests.py`, 7 tests).
