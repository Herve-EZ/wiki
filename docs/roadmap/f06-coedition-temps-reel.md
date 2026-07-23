# F6 — Coédition temps réel (CRDT / Yjs)

[← Roadmap](ROADMAP.md) · **Cible : v1.0** · **Effort : XL**

---

## Objectif & valeur

Aujourd'hui, l'édition se fait **section par section avec verrou** : robuste, mais une
seule personne modifie une section à la fois. La coédition **caractère par caractère**
(type Google Docs) permet à plusieurs personnes d'écrire **dans la même section
simultanément**, avec curseurs distants visibles.

C'est la fonctionnalité **vitrine** — mais un vrai chantier (d'où la cible v1.0).

## Périmètre fonctionnel

- Plusieurs utilisateurs éditent la même page/section en même temps, sans écrasement.
- **Curseurs & sélections distants** affichés avec le nom/couleur de chacun.
- Convergence automatique (CRDT) même après déconnexion/reconnexion brève.
- Compatibilité **hors-ligne** : les modifications locales fusionnent à la reconnexion.
- Les verrous de section deviennent **optionnels** (ou supprimés) une fois la coédition fiable.

## Conception technique

### Choix : CRDT (Yjs)
- **Yjs** (`Y.Doc`, `Y.Text`) pour le type texte collaboratif ; `y-protocols/awareness`
  pour la présence fine (curseurs).
- Transport : le **WebSocket existant** (Django Channels, `usePageSocket`/`lib/ws.ts`).
  Implémenter un provider Yjs custom au-dessus du canal `page_<id>` (ou intégrer
  `y-websocket` côté serveur).

### Backend (Channels)
- Le consumer de page relaie les **updates Yjs** (binaire) entre clients d'une même page.
- **Persistance** : stocker l'état Yjs (`Y.encodeStateAsUpdate`) périodiquement/à la
  dernière déconnexion, dans une table `PageCRDTState(page, state_blob, updated_at)`.
- **Snapshots de version** : continuer à produire un `PageVersion` (Markdown) à
  intervalle/perte de quorum, pour préserver l'historique existant (diff/restore).
- Convertir Y.Text ↔ Markdown : le document reste **Markdown** comme source
  canonique ; Yjs porte le texte, on sérialise vers `content_md` lors des snapshots.

### Frontend
- Remplacer le `<textarea>` de `MarkdownEditor` par un binding Yjs (textarea binding
  `y-textarea`, ou éditeur code type CodeMirror 6 + `y-codemirror.next`).
- Awareness : afficher les curseurs distants (couleur = seed email, comme les avatars).
- Fusionner avec le pipeline offline : Yjs gère la fusion ; l'outbox devient
  secondaire pour ce contenu.

### Migration depuis les verrous
- Phase de cohabitation : coédition activable par espace (flag) ; verrous conservés en
  repli tant que la coédition n'est pas généralisée.

## Impacts
- **Dépendances** : `yjs`, `y-protocols`, un binding éditeur (`y-codemirror.next` ou `y-textarea`).
- **Backend** : consumer étendu (relais binaire), modèle `PageCRDTState`, stratégie de snapshot.
- **Frontend** : refonte de la surface d'édition, gestion awareness.
- **Historique** : adapter la génération de versions (snapshots).

## Effort & découpage (indicatif)
1. POC Yjs + provider sur le WS existant (une page, deux clients).
2. Persistance de l'état + snapshots Markdown pour l'historique.
3. Awareness (curseurs distants).
4. Intégration hors-ligne + montée en charge + tests.
5. Bascule/retrait progressif des verrous de section.

## Dépendances
WebSocket/Channels (existant), sections (existant), historique (existant). Aucune fonctionnalité v0.9/v0.10 n'est bloquante, mais la stabilité de la présence aide.

## Risques & décisions ouvertes
- **Markdown + CRDT** : éditer du Markdown brut en coédition (simple) vs éditeur riche WYSIWYG (plus lourd). Proposé : Markdown en CodeMirror d'abord.
- **Taille de l'état Yjs** dans le temps (compaction nécessaire).
- **Sécurité** : valider les updates (un client ne doit pas corrompre l'état).
- Interaction avec l'audit `django-simple-history` (basé sur les saves de `Page`).

## Critères d'acceptation
- [ ] Deux clients éditent la même section simultanément sans perte ni écrasement.
- [ ] Les curseurs/sélections distants s'affichent avec l'identité de chacun.
- [ ] Une déconnexion brève puis reconnexion converge sans conflit.
- [ ] L'historique (versions/diff/restore) reste fonctionnel via snapshots.
- [ ] Le mode hors-ligne fusionne proprement à la reconnexion.
