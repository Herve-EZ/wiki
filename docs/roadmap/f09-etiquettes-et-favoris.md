# F9 — Étiquettes (tags) & favoris/épingles

[← Roadmap](ROADMAP.md) · **Cible : v0.9** · **Effort : M**

---

## Objectif & valeur

Dans un espace qui grossit, l'arborescence ne suffit plus. Les **étiquettes**
permettent une classification transversale (par thème, statut, équipe), et les
**favoris/épingles** donnent un accès immédiat aux pages qui comptent.

- Retrouver « toutes les pages `runbook` » quel que soit leur emplacement dans l'arbre.
- Épingler 3–4 pages de référence en haut de la barre latérale.

## Périmètre fonctionnel

**Étiquettes**
- Ajouter/retirer une ou plusieurs étiquettes sur une page (barre d'actions de la page).
- Les étiquettes sont **propres à l'espace** (autocomplétion sur les tags existants).
- Cliquer une étiquette → liste des pages qui la portent (vue filtrée).
- Filtrer la liste des pages / la recherche par étiquette.

**Favoris / épingles**
- Un bouton **étoile** sur chaque page pour la mettre en favori (par utilisateur).
- Section **« Favoris »** en haut de la barre latérale.
- (Option) le **propriétaire** peut *épingler* une page pour tout l'espace (favori partagé).

## Conception technique

### Backend (Django/DRF)
- Modèle `Tag(workspace, name, slug, color?)` avec `unique_together(workspace, slug)`.
- Table de liaison `PageTag(page, tag)` (M2M via un modèle explicite pour l'audit).
- Modèle `Favorite(user, page)` (`unique_together`) — favori personnel.
- (Option) `Page.pinned: bool` pour l'épingle d'espace (owner-only).
- Endpoints :
  - `GET/POST /api/workspaces/{slug}/tags/` — liste / création (écriture).
  - `PATCH /api/pages/{id}/` accepte `tags: [tag_id]` (remplacement), ou actions `tags/add` `tags/remove`.
  - `GET /api/workspaces/{slug}/pages/?tag={slug}` — filtre.
  - `POST/DELETE /api/pages/{id}/favorite/` — bascule le favori de l'appelant.
- `PageListSerializer` expose `tags: [{id,name,slug,color}]` et `is_favorite: bool`.

### Frontend (React)
- `PageActions` : sélecteur d'étiquettes (réutilise le pattern des pickers existants) + bouton favori (étoile).
- `Sidebar` : section **Favoris** au-dessus de « Pages » ; puce de couleur des tags optionnelle sur les lignes.
- Vue filtrée : réutiliser `WorkspaceHome`/liste avec un paramètre `?tag=`.
- Types : `Tag`, `PageListItem.tags`, `PageListItem.is_favorite`.

### Hors-ligne
- Tags/favoris affichés depuis le cache react-query persistant ; la modification est **en ligne** (comme le déplacement de page). Documenter la limite.

## Impacts
- **Modèles** : `Tag`, `PageTag`, `Favorite` (+ migration).
- **Endpoints** : tags CRUD, favorite toggle, filtre `?tag=`.
- **UI** : PageActions, Sidebar, vue filtrée.

## Effort & découpage
1. Backend tags + favoris + tests (M/2).
2. Front tags (picker + affichage + filtre) (M/2).
3. Front favoris (étoile + section sidebar).

## Dépendances
Aucune bloquante. S'appuie sur l'arborescence (F7) pour la sidebar.

## Risques & décisions ouvertes
- **Épingle d'espace** : la garder ou se limiter aux favoris perso pour la v0.9 ? (proposé : favoris perso d'abord, épingle en option.)
- Couleur des tags : palette imposée vs libre.

## Critères d'acceptation
- [ ] Un éditeur peut créer une étiquette et l'appliquer à une page.
- [ ] Filtrer par étiquette liste exactement les pages concernées de l'espace.
- [ ] Un utilisateur peut mettre/retirer une page de ses favoris ; ils apparaissent dans la sidebar.
- [ ] Permissions vérifiées serveur (viewer ne modifie pas les tags).
- [ ] Tests backend : création tag, filtre, favori toggle, permissions.
