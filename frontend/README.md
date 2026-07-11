# WikiCollab — frontend & app de bureau

SPA **Vite + React + TypeScript** (Tailwind v4), servie en web **et** embarquée dans
l'app de bureau **Tauri V2**. Le même code tourne dans les deux cibles ; les fonctions
desktop (SQLite local, commandes natives) sont activées via `isTauri()`.

## Prérequis

- Node 20+ et **pnpm**
- Pour la cible desktop : **Rust** (stable) + les [prérequis système Tauri](https://v2.tauri.app/start/prerequisites/)

## Développement

```bash
pnpm install
cp .env.example .env            # VITE_API_URL / VITE_WS_URL vers le backend Daphne

# Web (navigateur) — mode en ligne uniquement
pnpm dev                        # http://localhost:5173

# Desktop (Tauri) — SQLite local + mode dégradé actifs
pnpm tauri dev
```

> Le stockage SQLite local et les commandes natives ne fonctionnent que dans la fenêtre
> Tauri (`pnpm tauri dev`), pas dans le navigateur seul (`pnpm dev`) — c'est voulu :
> le build web reste fonctionnel en ligne, sans mode dégradé.

## Build

```bash
pnpm build                      # SPA web → dist/
pnpm tauri build                # binaires desktop : .msi/.exe, .dmg, .AppImage/.deb
```

## Architecture (mode dégradé)

| Couche | Rôle |
|---|---|
| `lib/platform.ts` | Détecte web vs desktop (`isTauri()`) |
| `lib/api.ts` | Client REST + refresh JWT ; distingue `ApiError` de `NetworkError` |
| `lib/db.ts` | Miroir SQLite local + file `outbox` (desktop) |
| `lib/sync.ts` | Rejeu FIFO de l'outbox à la reconnexion |
| `lib/network.ts` + `useNetworkStatus` | Bascule en ligne / hors-ligne |
| `lib/native.ts` | Export markdown, notifications, ouverture URL (SSO) |
| `src-tauri/` | Rust : plugins, migrations SQLite, commandes natives, capabilities scopées |

En ligne, l'édition passe par l'API (verrous de section actifs). Hors-ligne, elle écrit
dans le miroir local et empile une mutation ; au retour du réseau, `sync.ts` la rejoue.
Un conflit (`ApiError`) est marqué pour résolution via le diff — jamais d'écrasement silencieux.
