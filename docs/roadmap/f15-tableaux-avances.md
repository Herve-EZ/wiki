# Tableaux avancés (cellules fusionnées, légendes)

[← Roadmap](ROADMAP.md) · **Cible : optionnel** · **Effort : S**

---

## Objectif & valeur

L'éditeur de tableau v0.8 produit du **GFM standard** (portable, diffable) mais ne
gère pas les **cellules fusionnées**, les **légendes** ni les **retours à la ligne en
cellule**. Cette extension répond à des besoins ponctuels de mise en forme riche.

> À n'implémenter que si le besoin est confirmé : le GFM reste le format par défaut
> (meilleure portabilité et diff).

## Périmètre fonctionnel

- Fusion de cellules (colspan / rowspan) dans l'éditeur visuel.
- Légende de tableau.
- Retour à la ligne / listes dans une cellule.

## Conception technique

### Rendu
- Ajouter le plugin **`markdown-it-multimd-table`** dans `lib/markdown.ts` (activer
  colspan/rowspan/`multiline`/`headerless`).
- ⚠️ Impact **export** : `docx.ts` reconstruit les tableaux à partir des tokens ; il
  faudrait gérer `colspan`/`rowspan` (attributs `gridSpan`/`vMerge` en OOXML). Le
  PDF (via `renderMarkdown`) suit automatiquement.

### Éditeur
- Étendre `TableEditor` : sélection multi-cellules + action « fusionner/défusionner »,
  champ légende. Générer la syntaxe multimd correspondante.
- `parseTableAt` doit apprendre à relire la syntaxe multimd (plus complexe que le GFM).

## Impacts
- **Dépendance** : `markdown-it-multimd-table`.
- **Front** : `markdown.ts`, `TableEditor`, `tables.ts` (parsing), `docx.ts` (export merges).

## Effort & découpage
1. Rendu (plugin) + CSS.
2. Éditeur (fusion + légende) + parsing.
3. Export DOCX des fusions.

## Risques & décisions ouvertes
- **Portabilité** : la syntaxe multimd n'est pas du GFM standard → moins portable, diff plus bruyant.
- Complexité de `parseTableAt` (aller-retour fiable).
- Proposé : n'activer que sur demande explicite d'un espace, ou garder en option.

## Critères d'acceptation
- [ ] Fusionner des cellules dans l'éditeur produit un tableau rendu correctement (web + PDF).
- [ ] L'export DOCX conserve les fusions.
- [ ] Un tableau GFM simple reste inchangé (pas de régression).
