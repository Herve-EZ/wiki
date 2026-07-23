# F12 — Recherche globale multi-espaces + filtres

[← Roadmap](ROADMAP.md) · **Cible : v0.10** · **Effort : M**

---

## Objectif & valeur

La recherche actuelle est **limitée à l'espace courant**. Les équipes travaillant sur
plusieurs espaces veulent chercher **partout où elles ont accès**, avec des filtres
(espace, statut, étiquette, auteur).

## Périmètre fonctionnel

- La palette **Ctrl/⌘ K** propose une bascule **« Cet espace / Tous mes espaces »**.
- Résultats groupés/étiquetés par **espace**.
- Filtres : par **espace**, **statut** (brouillon/publié/archivé), **étiquette** (si F9),
  **auteur**.
- Chaque résultat garde le surlignage et le saut à la première occurrence (comme aujourd'hui).

## Conception technique

### Backend
- L'endpoint `GET /api/search` existe déjà et **scope déjà par workspaces accessibles**
  quand `workspace` n'est pas fourni (`_accessible_workspaces`). Il suffit de :
  - Rendre le paramètre `workspace` **optionnel** (déjà le cas) et documenter le mode global.
  - Ajouter des filtres query : `status`, `author`, `tag` (si F9), `limit`.
  - Enrichir chaque résultat avec `workspace_slug` + `workspace_name` pour le groupement.
- S'appuie sur `search_pages_with_snippets` (PostgreSQL full-text) déjà en place ;
  ajouter les `.filter(...)` correspondants avant l'appel.
- Exclure les pages en corbeille (`deleted_at__isnull=True`) — déjà fait.

### Frontend
- `SearchPalette` : ajouter la bascule de portée + les filtres (chips/menus) ;
  passer/omettre `workspace` selon la portée.
- Grouper les résultats par espace (titre de groupe = nom d'espace) ; à la sélection,
  naviguer vers `/w/{slug}/{id}` (le slug vient du résultat).
- `api.search` : signature étendue (`{ q, workspace?, status?, author?, tag? }`).
- Types : `SearchResult` gagne `workspace_slug`, `workspace_name`.

### Performance
- Limiter le nombre de résultats (ex. 30) et débouncer (déjà ~180 ms).
- Index full-text PostgreSQL déjà utilisé ; vérifier le plan sur multi-espaces.

## Impacts
- **Backend** : `SearchView` (filtres + enrichissement) — pas de nouveau modèle.
- **Front** : `SearchPalette`, `api.search`, types.

## Effort & découpage
1. Backend : filtres + enrichissement résultats + tests (M/2).
2. Front : bascule portée + groupement par espace.
3. Front : filtres (statut/auteur/tag).

## Dépendances
Recherche full-text existante. Le filtre par étiquette dépend de **F9**.

## Risques & décisions ouvertes
- Pertinence inter-espaces (ranking) : garder le ranking PostgreSQL simple d'abord.
- Volume : paginer si nécessaire (aujourd'hui non paginé).

## Critères d'acceptation
- [ ] En mode « Tous mes espaces », la recherche retourne des pages de plusieurs espaces accessibles.
- [ ] Les résultats indiquent leur espace et y naviguent correctement.
- [ ] Les filtres statut/auteur (et tag si F9) restreignent les résultats.
- [ ] Aucune page d'un espace non accessible n'apparaît.
- [ ] Tests backend : scope multi-espaces, filtres, exclusion corbeille.
