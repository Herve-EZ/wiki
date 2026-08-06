# Roadmap & spécifications — WikiCollab

Cet espace regroupe la **feuille de route** du produit et les **spécifications
détaillées** des fonctionnalités proposées (livrées et à venir).

- 📍 [Feuille de route (ROADMAP)](ROADMAP.md) — vision, versions, priorités, chronologie.

## Spécifications par fonctionnalité

Chaque document décrit : objectif & valeur, périmètre fonctionnel (user stories),
conception technique (backend / frontend), impacts (modèles, endpoints, UI), effort,
dépendances, risques et **critères d'acceptation**.

### À venir

| Réf | Fonctionnalité | Cible | Effort |
|---|---|---|---|
| F9 | [Étiquettes & favoris](f09-etiquettes-et-favoris.md) | v0.9 | M |
| F13 | [Partage par lien public](f13-partage-public.md) | v0.9 | M |
| F17b | Mermaid dans l'export `.docx` — reste de [F17](ROADMAP.md), livré pour la lecture et le PDF | v0.9 | S |
| F18 | Commentaires ancrés sur blocs + mentions `@user` *(spec à rédiger)* | v0.9 | L |
| F19 | Mode suggestion validé par un owner *(spec à rédiger)* | v0.9 | L |
| F20 | Vue graphe des liens *(spec à rédiger)* | v0.9 | M |
| F21 | Docs-as-code : sync `.md` Git ↔ wiki *(spec à rédiger)* | v0.9.1 | L |
| F22 | Auto-link des références `#123` / `PROJ-456` *(spec à rédiger)* | v0.9.1 | S |
| F23 | Bot Slack/Teams sur page suivie *(spec à rédiger)* | v0.9.1 | M |
| F24 | Propriétaire de page & fraîcheur *(spec à rédiger)* | v0.9.2 | M |
| F25 | Pages orphelines & liens morts *(spec à rédiger)* | v0.9.2 | S |
| F26 | Analytics de lecture & recherches sans résultat *(spec à rédiger)* | v0.9.2 | M |
| F12 | [Recherche globale multi-espaces](f12-recherche-globale.md) | v0.10 | M |
| F14 | [API personnelle & webhooks](f14-api-et-webhooks.md) | v0.10 | M |
| F27 | Transcription vidéo indexée *(spec à rédiger)* | v0.10.1 | L |
| F28 | Chapitres & timestamps liés aux sections *(spec à rédiger)* | v0.10.1 | M |
| F29 | Badge d'obsolescence des démos *(spec à rédiger)* | v0.10.1 | S |
| F30 | Recherche sémantique `pgvector` *(spec à rédiger)* | v0.11 | L |
| F31 | « Demande au wiki » : RAG avec citations *(spec à rédiger)* | v0.11 | XL |
| F32 | Résumé auto des changements *(spec à rédiger)* | v0.11 | M |
| F6 | [Coédition temps réel (CRDT)](f06-coedition-temps-reel.md) | v1.0 | XL |
| — | [Tableaux avancés (cellules fusionnées)](f15-tableaux-avances.md) | optionnel | S |
| — | [Finitions & dette technique](finitions.md) | continu | S |

### Déjà livré (v0.9)

| Réf | Fonctionnalité |
|---|---|
| F10 | [Modèles de page](f10-modeles-de-page.md) — 4 modèles intégrés (runbook, ADR, post-mortem, onboarding) + modèles gérés par l'espace |
| F16 | [Transclusion de blocs](f16-transclusion.md) — `![[page#section]]` pour inclure une section sans la dupliquer |
| — | Refonte visuelle du design system (tokens, focus, typographie de lecture) et passage des icônes à **lucide-react** |
| — | **Refonte de la disposition** : barre haute unique, rail de contexte, barre latérale repliable, points de rupture — voir le détail dans la [roadmap](ROADMAP.md) |
| F17 | **Rendu Mermaid** refondu (module unique, thème, erreurs lisibles, zoom, export PDF) — reste le `.docx` en F17b |

### Déjà livré (v0.8)

Barre d'outils & menu `/`, éditeur de tableaux, diagrammes Mermaid, sommaire
automatique, listes de tâches, images & pièces jointes (dont **upload différé
hors-ligne**), arborescence de pages, corbeille, commentaires en ligne (dont
**notifications**), export tableaux + **images dans le .docx**.

Voir le [guide utilisateur](../README.md) pour l'usage de ces fonctionnalités.

---

## Convention

- **Effort** : S (petit, < 2 j), M (moyen, ~1 semaine), L (gros, ~2–3 semaines), XL (chantier).
- **Réf** : identifiant stable repris dans les commits et la roadmap.
- Ces documents sont **vivants** : ils évoluent avant/pendant l'implémentation.
