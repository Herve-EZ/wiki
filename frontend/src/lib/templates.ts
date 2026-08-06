/**
 * Page templates: reusable Markdown skeletons a page can start from.
 *
 * Two sources, presented as one list in the UI:
 * - the four **built-ins** below, always available in every workspace;
 * - **workspace templates** (`PageTemplate`), managed by the owner in the
 *   workspace settings.
 *
 * Both go through `applyTemplateVars` at instantiation, which fills the
 * `{{titre}}` / `{{date}}` / `{{auteur}}` placeholders client-side.
 */
import type { IconName } from "../components/Icon";
import type { PageTemplate } from "./types";

export interface TemplateChoice {
  /** `builtin:<key>` or the PageTemplate UUID. */
  id: string;
  name: string;
  description: string;
  icon: IconName;
  content_md: string;
  /** Workspace templates can be edited by the owner; built-ins cannot. */
  builtin: boolean;
}

const RUNBOOK = `# {{titre}}

> Runbook — dernière revue : {{date}} · responsable : {{auteur}}

## Quand appliquer ce runbook

Symptômes ou alerte qui déclenchent cette procédure.

## Prérequis

- [ ] Accès requis (VPN, comptes, droits)
- [ ] Outils à avoir sous la main

## Diagnostic

| # | Vérification | Résultat attendu |
|---|---|---|
| 1 |  |  |
| 2 |  |  |

## Procédure de résolution

1. Première action
2. Deuxième action

\`\`\`bash
commande-exacte --copiable
\`\`\`

## Vérifier le retour à la normale

- [ ] Indicateur 1 revenu à la normale
- [ ] Alerte close

## Escalade

Qui prévenir, à partir de quand, et par quel canal.
`;

const ADR = `# {{titre}}

> ADR · Statut : **Proposé** · Date : {{date}} · Auteur : {{auteur}}

*Statuts possibles : Proposé · Accepté · Rejeté · Remplacé par [[ADR-xxx]]*

## Contexte

Le problème à résoudre et les contraintes en vigueur (techniques, délais, équipe).

## Décision

Ce que nous décidons de faire, formulé à l'affirmatif : « Nous allons… ».

## Options envisagées

### Option A — retenue

- **Pour** :
- **Contre** :

### Option B

- **Pour** :
- **Contre** :

## Conséquences

Ce que cette décision rend plus facile, plus difficile, et ce qu'elle nous engage
à faire ensuite.

## Références

- Discussions, tickets, mesures ayant appuyé la décision.
`;

const POSTMORTEM = `# {{titre}}

> Post-mortem sans blâme · Rédigé le {{date}} par {{auteur}}

## Résumé

Deux à trois phrases compréhensibles par quelqu'un d'extérieur à l'équipe.

## Impact

- **Durée** : du … au …
- **Utilisateurs affectés** :
- **Fonctionnalités dégradées** :

## Chronologie

| Heure | Événement |
|---|---|
|  | Début de l'incident |
|  | Détection |
|  | Rétablissement |

## Cause racine

Ce qui a réellement provoqué l'incident — le mécanisme, pas la personne.

## Ce qui a bien fonctionné

-

## Ce qui nous a ralentis

-

## Actions correctives

| Action | Responsable | Échéance | Suivi |
|---|---|---|---|
|  |  |  | à faire |

## Leçons retenues

Ce que l'équipe sait désormais et qui doit survivre à cet incident.
`;

const ONBOARDING = `# {{titre}}

> Parcours d'intégration · mis à jour le {{date}} · référent : {{auteur}}

## Bienvenue

Ce que fait l'équipe, et le rôle que vous allez y tenir.

## Jour 1 — accès et installation

- [ ] Comptes créés (messagerie, SSO, dépôt de code)
- [ ] Poste de travail configuré
- [ ] Dépôt cloné et projet lancé en local

## Semaine 1 — comprendre le terrain

- [ ] Lire l'architecture générale
- [ ] Parcourir les runbooks de l'équipe
- [ ] Assister aux rituels (points quotidiens, revues)
- [ ] Première contribution : une correction simple, de bout en bout

## Interlocuteurs

| Sujet | Personne |
|---|---|
| Technique |  |
| Produit |  |
| Ressources humaines |  |

## Rituels de l'équipe

Quand, avec qui, et pour quoi faire.

## Où trouver quoi

- Documentation :
- Suivi des tâches :
- Supervision et alertes :
`;

/** Always-available templates, deliberately opinionated and ready to fill in. */
export const BUILTIN_TEMPLATES: TemplateChoice[] = [
  {
    id: "builtin:runbook",
    name: "Runbook",
    description: "Procédure d'exploitation : diagnostic, résolution, escalade.",
    icon: "terminal",
    content_md: RUNBOOK,
    builtin: true,
  },
  {
    id: "builtin:adr",
    name: "ADR — décision d'architecture",
    description: "Contexte, décision, options envisagées et conséquences.",
    icon: "scale",
    content_md: ADR,
    builtin: true,
  },
  {
    id: "builtin:postmortem",
    name: "Post-mortem",
    description: "Analyse d'incident sans blâme : impact, cause racine, actions.",
    icon: "siren",
    content_md: POSTMORTEM,
    builtin: true,
  },
  {
    id: "builtin:onboarding",
    name: "Onboarding",
    description: "Parcours d'intégration : jour 1, semaine 1, interlocuteurs.",
    icon: "graduationCap",
    content_md: ONBOARDING,
    builtin: true,
  },
];

/** Workspace templates, presented alongside the built-ins. */
export function toChoice(tpl: PageTemplate): TemplateChoice {
  return {
    id: tpl.id,
    name: tpl.name,
    description: tpl.description,
    icon: "template",
    content_md: tpl.content_md,
    builtin: false,
  };
}

export interface TemplateVars {
  titre: string;
  auteur: string;
}

/**
 * Fill `{{titre}}`, `{{date}}` and `{{auteur}}`. Substitution happens here, at
 * instantiation, so the stored template keeps its placeholders — and an unknown
 * placeholder is left visible rather than silently dropped.
 */
export function applyTemplateVars(content: string, vars: TemplateVars): string {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const values: Record<string, string> = {
    titre: vars.titre,
    date: today,
    auteur: vars.auteur,
  };
  return content.replace(/\{\{\s*(titre|date|auteur)\s*\}\}/gi, (_m, key: string) =>
    values[key.toLowerCase()] ?? _m,
  );
}
