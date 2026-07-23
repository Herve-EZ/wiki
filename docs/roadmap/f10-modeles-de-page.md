# F10 — Modèles de page (templates)

[← Roadmap](ROADMAP.md) · **Cible : v0.9** · **Effort : M**

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

## Risques & décisions ouvertes
- **Variables** : périmètre (juste date/auteur/titre) ou moteur plus riche ? Proposé : minimal.
- Modèles **globaux** (instance) en plus des modèles d'espace ? Hors périmètre v0.9.

## Critères d'acceptation
- [ ] Le propriétaire crée un modèle avec du contenu Markdown.
- [ ] Créer une page « depuis un modèle » pré-remplit le contenu.
- [ ] Les variables `{{date}}`/`{{titre}}`/`{{auteur}}` (si retenues) sont substituées.
- [ ] Écriture des modèles réservée au propriétaire (vérifié serveur).
- [ ] Tests backend : CRUD + permissions.
