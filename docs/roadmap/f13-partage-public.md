# F13 — Partage par lien public (lecture seule)

[← Roadmap](ROADMAP.md) · **Cible : v0.9** · **Effort : M**

---

## Objectif & valeur

Diffuser une page **publiée** vers l'extérieur (client, prestataire, public) via une
**URL sans compte**, en lecture seule, sans exposer le reste de l'espace.

- Partager une doc publique/CGU/changelog.
- Envoyer une page à quelqu'un qui n'a pas accès à l'instance.

## Périmètre fonctionnel

- Sur une page **Publiée**, le propriétaire (ou éditeur ?) active **« Partager
  publiquement »** → génère un **lien à jeton** (`/public/{token}`).
- Le lien affiche la page en **lecture seule** : titre + contenu rendu (Markdown,
  tableaux, Mermaid, images), sans barre latérale ni actions d'édition.
- **Révocation** : désactiver le partage invalide le lien.
- Le partage respecte le statut : si la page repasse en **Brouillon/Archivé**, le
  lien public renvoie « indisponible ».
- (Option) case **« indexable »** (autoriser/interdire les moteurs via `noindex`).

## Conception technique

### Backend
- Modèle `PublicShare(page OneToOne, token uuid, enabled, created_by, created_at)`.
- Endpoints authentifiés :
  - `POST /api/pages/{id}/share/` → crée/active, renvoie `token` (owner/écriture).
  - `DELETE /api/pages/{id}/share/` → révoque.
  - `GET /api/pages/{id}/share/` → état courant.
- Endpoint **public** (AllowAny) : `GET /api/public/{token}/` → `{title, content_md, updated_at}`
  **uniquement si** `enabled` ET `page.status == published` ET page non supprimée.
  Ne renvoie ni structure d'espace ni métadonnées sensibles.
- Rendu : renvoyer le `content_md` brut ; le rendu HTML se fait côté page publique
  (réutilise `renderMarkdown`). Les **wikilinks** internes sont neutralisés (texte
  simple) pour ne pas fuiter l'arbo.

### Frontend
- `PageActions` : bouton **Partager** (visible si page publiée) → modale avec le lien,
  copier, bascule activer/désactiver.
- Nouvelle route **publique** `/public/:token` (hors `RequireAuth`) : layout minimal
  (logo instance, titre, contenu rendu, mention « lecture seule »). Réutilise
  `renderMarkdown` + le CSS `.md-body`.
- Types : `PublicShare`.

### Sécurité
- Le jeton est **non devinable** (UUID). L'endpoint public ne renvoie que le
  strict nécessaire. Les **images** d'une page publique s'appuient sur l'URL-capacité
  des attachments (déjà publique). Pas d'exposition des commentaires/historique.

## Impacts
- **Modèle** : `PublicShare` (+ migration).
- **Endpoints** : share CRUD + endpoint public non authentifié.
- **Front** : route publique, modale de partage, `App.tsx` (route hors auth).

## Effort & découpage
1. Backend `PublicShare` + endpoints (auth + public) + tests (M/2).
2. Front modale de partage dans `PageActions`.
3. Front route publique `/public/:token` (layout lecture seule).

## Dépendances
Statut « Publié » (existant), `renderMarkdown` (existant), URL-capacité des attachments (existant).

## Risques & décisions ouvertes
- **Qui peut partager** : owner seulement, ou éditeur ? Proposé : owner.
- **Wikilinks** dans une page publique : neutraliser (proposé) vs suivre si la cible est aussi partagée (plus complexe).
- **CORS/robots** : entête `noindex` par défaut ; option pour autoriser l'indexation.

## Critères d'acceptation
- [ ] Activer le partage d'une page publiée fournit une URL fonctionnelle en navigation privée (sans login).
- [ ] La page publique affiche le contenu rendu (tableaux, Mermaid, images) en lecture seule.
- [ ] Révoquer, ou repasser la page en brouillon, rend le lien « indisponible ».
- [ ] L'endpoint public ne fuit ni l'arborescence, ni les commentaires, ni l'historique.
- [ ] Tests backend : accès public conditionné au statut+enabled, révocation, 404 sinon.
