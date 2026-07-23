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
| F10 | [Modèles de page (templates)](f10-modeles-de-page.md) | v0.9 | M |
| F13 | [Partage par lien public](f13-partage-public.md) | v0.9 | M |
| F12 | [Recherche globale multi-espaces](f12-recherche-globale.md) | v0.10 | M |
| F14 | [API personnelle & webhooks](f14-api-et-webhooks.md) | v0.10 | M |
| F6 | [Coédition temps réel (CRDT)](f06-coedition-temps-reel.md) | v1.0 | XL |
| — | [Tableaux avancés (cellules fusionnées)](f15-tableaux-avances.md) | optionnel | S |
| — | [Finitions & dette technique](finitions.md) | continu | S |

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
