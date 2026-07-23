# Finitions & dette technique

[← Roadmap](ROADMAP.md) · **Cible : continu** · **Effort : S**

---

Petites tâches d'amélioration et dettes issues des livraisons v0.8. Aucune n'est
bloquante ; à traiter au fil de l'eau.

## Éditeur / hors-ligne

- **Rendu du placeholder d'image hors-ligne** — avant synchro, une image en attente
  s'affiche « cassée » (`pending:<id>`). Ajouter un rendu dédié dans `markdown.ts`
  (règle image : si `src` commence par `pending:`, afficher un encadré « 📎 envoi en
  attente » au lieu d'un `<img>` cassé). *Effort : S.*

- **Recréation de page conserve le `parent`** — `ConflictsModal`/`MissingPageDialog`
  recréent une page depuis le cache local (titre + contenu + statut) sans le `parent`.
  Ajouter `parent` à `ConflictEntry` (SELECT) et au payload de recréation pour
  préserver la hiérarchie. *Effort : S.*

## Notifications

- **Préférence « Commentaires »** — les toggles de *Paramètres → Notifications* ne
  couvrent pas encore le type `comment`. Ajouter le toggle (stockage local par
  appareil, comme les autres) et le prendre en compte dans le filtrage des toasts. *Effort : S.*

## Export

- **Images dans le DOCX : formats** — seuls png/jpeg/gif sont intégrés ; les **SVG**
  retombent sur le texte alt. Option : rasteriser le SVG (canvas) avant intégration. *Effort : S/M.*

## Qualité / CI

- **Compilation Rust** — la migration SQLite v2 (`lib.rs`) n'a pas été compilée en
  local ; s'assurer que la CI/`pnpm tauri build` passe. *Effort : S.*
- **Lints non rejoués en local** — confirmer `ruff` (backend) et `oxlint` (frontend)
  en CI sur les derniers lots. *Effort : S.*
- **Tests front** — le projet n'a pas de tests unitaires JS ; envisager quelques tests
  ciblés sur les utilitaires purs (`tables.ts`, `editorActions.ts`, `pageTree.ts`). *Effort : M.*

## Divers

- **Toggle coédition/verrous** — anticiper un flag par espace pour la bascule vers F6.
- **Accessibilité** — passe a11y sur les nouveaux composants (rôles ARIA du menu `/`,
  focus trap des modales, contrastes).

---

*Ce document est un bac à idées d'amélioration continue ; il n'a pas de version cible fixe.*
