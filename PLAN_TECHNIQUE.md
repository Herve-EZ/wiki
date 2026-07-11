# WikiCollab — Plan technique d'implémentation

> Compagnon du PRD v1.0. Décompose le MVP en décisions techniques, arborescence,
> et tâches concrètes phase par phase. Objectif : pouvoir coder sans re-décider à chaque étape.

---

## 0. Décisions techniques verrouillées

Choix pris maintenant pour éviter de les rouvrir en cours de route.

| Sujet | Décision | Raison |
|---|---|---|
| Versions | Python 3.12, Node 20 LTS, PostgreSQL 16, Redis 7 | Stables, supportés longtemps |
| Backend | Django 5.0 + DRF 3.15 + Channels 4 + Daphne | ASGI natif, un seul serveur HTTP+WS |
| Auth (tokens API/WS) | djangorestframework-simplejwt | JWT stateless, token dans query string pour le WS |
| SSO + MFA | django-allauth | Couvre en un seul paquet : OAuth2/OIDC social, SAML 2.0, et MFA (TOTP + codes de secours) |
| SAML 2.0 | allauth SAML provider (pysaml2) | Okta / Azure AD / OneLogin ; multi-IdP par organisation |
| OAuth2/OIDC social | allauth providers | Google, GitHub, Microsoft (OIDC générique possible) |
| MFA | allauth.mfa | TOTP (authenticator app) + recovery codes à usage unique |
| Gestionnaire paquets Python | `uv` (ou pip + requirements.txt en fallback) | Rapide, lockfile reproductible |
| **PK + audit (backend)** | `core.BaseModel` : UUID + timestamps + **django-simple-history** | PK non devinables, merge-friendly ; audit trail hérité par tous les modèles métier |
| Frontend | **Vite 6 + React 18 + TypeScript (SPA)** | App 100 % client, embarquée dans Tauri ; le SSG Astro était inadapté à une cible desktop hors-ligne |
| **Cible desktop** | **Tauri V2** (Rust) — Windows / macOS / Linux (+ mobile possible) | Binaire léger, webview système, IPC Rust, système de *capabilities* sécurisé |
| **Mode dégradé (hors-ligne)** | Miroir **SQLite local** (`tauri-plugin-sql`) + **outbox** de mutations rejouée à la reconnexion | Travail local si serveur injoignable ; réconciliation via l'historique de versions existant |
| **État serveur / cache** | **TanStack Query** + persistance (`persistQueryClient`) + mutations hors-ligne | Cache des lectures persistant, file de mutations FIFO avec retry |
| **Commandes natives (Rust)** | `#[tauri::command]` (export, ouvrir dossier, notifications) + `tauri-plugin-shell` scopé (git, pandoc) | Opérations natives + outils externes, allowlist par regex |
| Styling | Tailwind CSS v4 | Rapide à itérer, cohérent |
| Client WS | Hook React natif `useWebSocket` maison + reconnexion | Pas de dépendance lourde |
| Markdown → HTML | `markdown-it` (front) | Cohérent avec l'édition |
| Diff | `difflib` (Python, côté serveur) exposé via API | Simple, pas de lib front |
| Tests backend | pytest + pytest-asyncio + pytest-django | Requis pour tester les consumers |
| Tests front | Vitest + Testing Library | Léger |
| Lint/format | ruff (Python), Biome ou ESLint+Prettier (TS) | Un seul outil rapide côté Python |
| CI | GitHub Actions | Cf. Phase 6 |
| Conteneurs | Docker Compose : `db`, `redis`, `web` (Daphne) | Cible PRD : déploiement < 30 min. Le desktop se distribue en binaire Tauri, pas en conteneur |

**Point d'architecture clé** : Daphne sert HTTP **et** WebSocket sur le même port. DRF gère
les routes `/api/**`, Channels gère `/ws/**`. Le frontend est une **SPA Vite + React** :
servie en web (build statique derrière nginx / Daphne), **et** embarquée telle quelle dans
l'app **Tauri V2** pour la distribution desktop. Le même code React tourne dans les deux cibles ;
une couche d'abstraction (`lib/platform.ts`) détecte si on est dans Tauri et active alors le
stockage SQLite local et les commandes natives.

**Architecture du mode dégradé (local-first pragmatique)** :

```
EN LIGNE            React ──REST/WS──▶ Django ──▶ Postgres     (verrous + présence, inchangés)
HORS-LIGNE          React ──▶ SQLite local (miroir)
                             └─▶ outbox (mutations en attente)
RECONNEXION         outbox ──rejeu──▶ API   ── conflit ? ──▶ UI diff/merge (PageVersion existant)
```

Les **verrous de section sont un mécanisme en ligne uniquement** : on ne peut pas acquérir un
verrou auprès d'un serveur injoignable. Hors-ligne, l'utilisateur édite sa copie locale ; à la
reconnexion, la file de mutations est rejouée contre l'API et tout conflit retombe sur
l'historique de versions immuable (diff visuel avant restauration). Pas de CRDT au MVP — évolution
Yjs documentée si la coédition temps réel devient un axe produit.

**Flux d'authentification (SSO/MFA + JWT)** : django-allauth pilote le *login* (SAML, OAuth
social, MFA) via son flux web ; à la fin du flux, on émet une paire **SimpleJWT**
(access + refresh) consommée ensuite par l'API REST et le WebSocket. Autrement dit :
allauth = *comment on prouve son identité* (SSO + second facteur), SimpleJWT = *le jeton
porté à chaque requête et à la connexion WS*. La connexion locale email/mot de passe reste
possible, avec MFA appliqué de la même façon. Le second facteur est vérifié **avant**
l'émission du JWT — aucun token n'est délivré tant que le MFA n'est pas validé.

---

## 1. Arborescence cible

```
Wiki/
├── PLAN_TECHNIQUE.md          # ce fichier
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── backend/
│   ├── pyproject.toml         # deps + config ruff/pytest
│   ├── manage.py
│   ├── Dockerfile
│   ├── conftest.py
│   ├── config/                # projet Django
│   │   ├── __init__.py
│   │   ├── settings.py        # (ou settings/ base|dev|prod)
│   │   ├── urls.py            # routes HTTP DRF
│   │   ├── asgi.py            # ProtocolTypeRouter HTTP + WS
│   │   └── wsgi.py
│   ├── accounts/              # User custom + auth JWT + SSO + MFA
│   │   ├── models.py          # User (email login)
│   │   ├── serializers.py
│   │   ├── views.py           # register, me, token, mfa/verify
│   │   ├── sso.py             # config providers social + SAML (allauth), émission JWT post-login
│   │   ├── mfa.py             # setup/activate TOTP, codes de secours, garde require_mfa
│   │   └── urls.py
│   ├── workspaces/
│   │   ├── models.py          # Workspace, WorkspaceMember
│   │   ├── serializers.py
│   │   ├── permissions.py     # IsOwner / IsEditor / IsViewer
│   │   ├── views.py
│   │   └── urls.py
│   ├── pages/
│   │   ├── models.py          # Page, PageVersion, PageLink
│   │   ├── serializers.py
│   │   ├── views.py           # CRUD + versions + diff + backlinks
│   │   ├── services.py        # snapshot, détection de liens, diff
│   │   ├── search.py          # fulltext PostgreSQL
│   │   └── urls.py
│   └── realtime/              # Django Channels
│       ├── consumers.py       # PageConsumer
│       ├── routing.py         # ws/page/<id>/
│       ├── middleware.py      # JWTAuthMiddleware (query string)
│       ├── presence.py        # logique Presence
│       └── locks.py           # logique SectionLock + TTL
│
└── frontend/                  # SPA Vite + React + TS (web ET desktop)
    ├── package.json
    ├── vite.config.ts
    ├── postcss.config.js       # Tailwind v4
    ├── tsconfig*.json
    ├── index.html
    ├── src/
    │   ├── main.tsx            # PersistQueryClientProvider + App
    │   ├── App.tsx
    │   ├── index.css           # tokens (clair/sombre) + Tailwind
    │   ├── components/         # React (Editor, PresenceBar, DiffView, Sidebar, StatusBar…)
    │   ├── hooks/
    │   │   ├── useNetworkStatus.ts   # accessibilité backend (online/offline)
    │   │   └── useOutboxCount.ts     # nb de modifs en attente (desktop)
    │   └── lib/
    │       ├── platform.ts     # détection isTauri()
    │       ├── api.ts          # client REST + refresh JWT (ApiError vs NetworkError)
    │       ├── ws.ts           # WebSocket + reconnexion + heartbeat
    │       ├── auth.ts         # stockage JWT (Tauri store / localStorage)
    │       ├── db.ts           # miroir SQLite local + outbox (desktop)
    │       ├── sync.ts         # rejeu de l'outbox à la reconnexion
    │       ├── network.ts      # état de connectivité
    │       ├── native.ts       # commandes natives (export, notif, outils) + fallback web
    │       └── queryClient.ts  # TanStack Query + persistance
    └── src-tauri/              # App de bureau Tauri V2 (Rust)
        ├── Cargo.toml          # plugins : sql, shell, store, dialog, fs, os, notification
        ├── tauri.conf.json
        ├── capabilities/default.json   # permissions scopées (shell = git/pandoc uniquement)
        └── src/
            ├── main.rs
            ├── lib.rs          # plugins + migrations SQLite locales + invoke_handler
            └── commands.rs     # #[tauri::command] : system_info, reveal_in_file_manager, run_tool
```

---

## 2. Modèles de données (détail d'implémentation)

Reprise des 7 modèles du PRD avec les champs concrets et les index.

**accounts.User** — `AbstractUser` custom, login par email.
`email` (unique), `display_name`, `avatar_url`, timestamps.

**Auth SSO/MFA** — fournis par django-allauth, pas à redéfinir :
- `socialaccount.SocialAccount` / `SocialApp` — comptes liés OAuth/OIDC (Google, GitHub, Microsoft).
- SAML configuré par organisation (un IdP par domaine email ou par workspace) ; les
  `SocialApp` SAML portent les métadonnées de l'IdP (entity_id, SSO URL, certificat).
- `mfa.Authenticator` — stocke le secret TOTP (chiffré) **et** les codes de secours par user.
- Règle métier à ajouter : possibilité de **rendre le MFA obligatoire** au niveau d'un
  workspace (`Workspace.require_mfa`), refus d'accès si un membre n'a pas de second facteur actif.

**workspaces.Workspace**
`slug` (unique, indexé), `name`, `permission` (`public|private|invite`),
`created_by` (FK User), `created_at`.

**workspaces.WorkspaceMember**
`workspace` (FK), `user` (FK), `role` (`owner|editor|viewer`).
Contrainte unique `(workspace, user)`.

**pages.Page**
`workspace` (FK), `title`, `slug` (unique par workspace), `content_md` (TextField),
`status` (`draft|published|archived`), `author` (FK), `created_at`, `updated_at`.
Index fulltext PostgreSQL sur `title` + `content_md` (`SearchVector`).

**pages.PageVersion** — snapshot immuable.
`page` (FK), `content_md`, `version_number` (int, incrémenté par page),
`author` (FK), `created_at`. Contrainte unique `(page, version_number)`.

**pages.PageLink** — relation auto-référentielle.
`from_page` (FK Page), `to_page` (FK Page). Unique `(from_page, to_page)`.
Alimenté par `services.detect_links()` à chaque sauvegarde.

**realtime.Presence** (ou géré en Redis pur — voir note)
`user` (FK), `page` (FK), `channel_name`, `last_seen`.
> **Note d'archi** : la présence est éphémère. Deux options —
> (a) table PostgreSQL nettoyée à la déconnexion (simple, fidèle au PRD), ou
> (b) clés Redis avec TTL (plus scalable). **MVP : option (a)**, migration Redis documentée.

**realtime.SectionLock**
`page` (FK), `user` (FK), `section_id` (str, ex `h2-3`), `locked_at`, `expires_at`.
Unique `(page, section_id)`. TTL 5 min via `expires_at` + tâche de nettoyage.

---

## 3. Contrats d'API et WebSocket

### REST (préfixe `/api/`)
```
POST   /auth/register
POST   /auth/token           # login local → MFA challenge OU access+refresh
POST   /auth/token/refresh
GET    /auth/me

# SSO (django-allauth)
GET    /auth/sso/providers            # liste des IdP disponibles (social + SAML)
GET    /auth/sso/{provider}/login     # démarre le flux OAuth/OIDC → redirect IdP
GET    /auth/sso/{provider}/callback  # retour IdP → session allauth → émission JWT
GET    /auth/saml/{org}/metadata      # métadonnées SP exposées à l'IdP
POST   /auth/saml/{org}/acs           # Assertion Consumer Service (retour SAML)

# MFA (allauth.mfa)
POST   /auth/mfa/totp/setup           # génère secret + QR code
POST   /auth/mfa/totp/activate        # valide le 1er code → active le TOTP
POST   /auth/mfa/verify               # 2e facteur pendant le login → émet le JWT
DELETE /auth/mfa/totp                  # désactive (ré-auth requise)
GET    /auth/mfa/recovery-codes        # affiche/régénère les codes de secours
POST   /auth/mfa/recovery-codes/verify # login via code de secours

GET    /workspaces
POST   /workspaces
GET    /workspaces/{slug}
POST   /workspaces/{slug}/members       # invitation
GET    /workspaces/{slug}/pages          # arborescence

GET    /pages/{id}
POST   /pages                            # crée + 1re PageVersion
PATCH  /pages/{id}                        # save → nouvelle PageVersion + detect_links
DELETE /pages/{id}
GET    /pages/{id}/versions
GET    /pages/{id}/versions/{n}
GET    /pages/{id}/diff?from=a&to=b       # diff visuel
POST   /pages/{id}/restore/{n}            # crée une nouvelle version
GET    /pages/{id}/backlinks
GET    /search?q=...&workspace=...
```

### WebSocket (`/ws/page/<id>/?token=<JWT>`)
Événements JSON `{ "type": "...", ...payload }`. Diffusés via groupe Redis `page_{id}`.

| Type | Sens | Payload |
|---|---|---|
| `presence.join` | S→C | `{user, avatar_url}` |
| `presence.leave` | S→C | `{user}` |
| `presence.sync` | S→C | liste des présents à la connexion |
| `heartbeat` | C→S | `{}` toutes les 30 s |
| `lock.acquire` | C→S puis S→C | `{section_id}` → `{section_id, user, expires_at}` |
| `lock.release` | C→S puis S→C | `{section_id}` |
| `lock.denied` | S→C | `{section_id, held_by}` |
| `notify.update` | S→C | `{page_id, title}` (aux pages liées) |

Règles : le consumer **persiste avant de diffuser** (SectionLock, PageVersion en base
d'abord, puis `group_send`). Nettoyage `Presence` + locks du user à `disconnect`.

---

## 4. Découpage en phases et tâches

Ordre = celui du PRD (dépendances respectées). Chaque tâche est un incrément testable.

### Phase 1 — Socle Django + auth (3–4 j) — *rallongé par SSO/MFA*
- [ ] Init `backend/` : Django 5 + DRF + Channels + Daphne, `pyproject.toml`, ruff
- [ ] `config/asgi.py` avec `ProtocolTypeRouter` (HTTP + WS placeholder)
- [ ] `accounts.User` custom (email login) + migration
- [ ] Auth SimpleJWT : register, token, refresh, `/me`
- [ ] **django-allauth** installé + configuré (headless/API mode)
- [ ] **SSO social** : providers Google + GitHub + Microsoft (OAuth/OIDC), callbacks → JWT
- [ ] **SSO SAML** : provider SAML allauth, endpoints metadata + ACS, 1 IdP de test (Keycloak local)
- [ ] **MFA TOTP** : setup (QR), activate, verify pendant le login ; JWT émis seulement après le 2e facteur
- [ ] **Codes de secours** : génération, affichage unique, vérification au login
- [ ] `Workspace.require_mfa` + garde d'accès si second facteur manquant
- [ ] `workspaces` : modèles Workspace + WorkspaceMember, migration
- [ ] Redis configuré comme channel layer (`CHANNELS_REDIS`)
- [ ] `docker-compose.yml` : db + redis + web (+ keycloak pour tester le SAML en dev)
- [ ] Tests : login local, flux MFA (TOTP + code de secours), callback SSO, création workspace

> **Contrat de login révisé** : `POST /auth/token` renvoie soit la paire JWT (pas de MFA),
> soit `{ "mfa_required": true, "ephemeral_token": "..." }`. Le client appelle alors
> `POST /auth/mfa/verify` avec ce jeton éphémère + le code TOTP (ou un code de secours)
> pour obtenir les JWT. Même logique après un retour SSO si le compte a le MFA activé.

### Phase 2 — CRUD pages + versioning (2–3 j)
- [ ] `pages.Page` + `PageVersion` + `PageLink`, migrations
- [ ] CRUD DRF pages ; PATCH crée une `PageVersion`
- [ ] `services.snapshot()` (versioning) + `services.diff()` (difflib)
- [ ] Endpoints versions, diff, restore, backlinks
- [ ] `services.detect_links()` : parse mentions de titres → `PageLink`
- [ ] Recherche fulltext PostgreSQL (`SearchVector`)
- [ ] Tests : versioning, diff, restauration, détection de liens

### Phase 3 — WebSocket présence (2–3 j)
- [ ] `realtime.middleware.JWTAuthMiddleware` (token en query string)
- [ ] `PageConsumer.connect` : valide JWT, rejoint `page_{id}`
- [ ] `presence.join/leave/sync` + modèle Presence
- [ ] Heartbeat 30 s + détection de déconnexion silencieuse
- [ ] Nettoyage Presence à `disconnect`
- [ ] Tests pytest-asyncio : connexion, présence multi-clients, heartbeat

### Phase 4 — WebSocket verrous + notifications (3–4 j)
- [ ] `locks.acquire/release` avec `SectionLock` (unique par section)
- [ ] `lock.denied` si section déjà verrouillée
- [ ] Expiration TTL 5 min (nettoyage périodique + à l'accès)
- [ ] `notify.update` diffusé aux pages qui référencent la page modifiée
- [ ] Tests : acquisition concurrente, expiration, notifications

### Phase 5 — Frontend SPA Vite + React (3–4 j)
- [x] Init Vite + React + Tailwind v4 + TS (`frontend/`)
- [x] `lib/api.ts` (REST + refresh JWT) + `lib/auth.ts` + `lib/ws.ts` (reconnexion + heartbeat)
- [x] `lib/queryClient.ts` : TanStack Query + persistance du cache
- [ ] Routing (react-router) : accueil, `/w/[workspace]/[page]`
- [ ] `Sidebar` (arborescence, pages récentes, badges mis à jour)
- [ ] `Editor` (Markdown + save + statut de verrou)
- [ ] `PresenceBar` (avatars live) branché sur `lib/ws.ts`
- [ ] `VersionHistory` + `DiffView` (endpoints versions/diff/restore)
- [ ] Tests Vitest sur les composants clés

### Phase 5bis — App de bureau Tauri V2 + mode dégradé (3–4 j)
- [x] Init Tauri V2 (`src-tauri/`), plugins sql/shell/store/dialog/fs/os/notification
- [x] Capabilities scopées : shell limité à `git`/`pandoc`, fs limité aux dossiers utilisateur
- [x] Commandes Rust natives : `system_info`, `reveal_in_file_manager`, `run_tool` (allow-list)
- [x] Miroir SQLite local (`page_cache` + `outbox`) via migrations Rust
- [x] `lib/db.ts` (miroir + outbox) + `lib/sync.ts` (rejeu FIFO à la reconnexion)
- [x] `lib/network.ts` + `useNetworkStatus` : bascule en ligne / mode dégradé
- [x] `lib/native.ts` : export markdown (dialog+fs), notifications, ouverture URL (SSO)
- [ ] UI de résolution de conflit sur rejeu échoué (réutilise `DiffView`)
- [ ] Bundle desktop signé (`tauri build`) : `.msi`/`.exe`, `.dmg`, `.AppImage`/`.deb`
- [ ] Tests Vitest de la couche offline (db/outbox/sync mockés) + smoke test Tauri

> **Contrat mode dégradé** : en ligne, l'édition passe par l'API (verrous actifs). Hors-ligne
> (desktop uniquement), l'édition écrit dans le miroir SQLite et empile une mutation dans
> l'`outbox` ; `sync.ts` la rejoue en FIFO à la reconnexion. Un `NetworkError` stoppe le rejeu
> (toujours hors-ligne) ; un `ApiError` (conflit) est marqué sur l'entrée pour une décision de
> merge via `DiffView` — jamais d'écrasement silencieux.

### Phase 6 — Polish & déploiement (2 j)
- [x] Permissions par workspace (owner/editor/viewer) sur toutes les routes
- [x] CI GitHub Actions : lint + tests backend (Postgres/Redis réels)
- [ ] `docker-compose.yml` complet (+ front web) ; README déploiement desktop (`tauri build`)
- [ ] CI : ajouter build frontend + build Tauri (matrice Windows/macOS/Linux)
- [ ] Couverture > 70 % sur consumers + logique métier
- [ ] Vérif métriques : latence WS, LCP, déploiement < 30 min

---

## 5. Ordre de démarrage recommandé

1. **Phase 1 d'abord jusqu'à `docker compose up` qui tourne** — un socle qui démarre
   vaut mieux qu'un code parfait non exécutable.
2. Backend complet (Phases 1→4) **avant** le front : le front consomme des contrats
   d'API déjà stables, moins de rework.
3. Écrire les tests des consumers **en même temps** que les consumers (Phase 3–4),
   pas après : le temps réel est le risque n°1 du PRD.

## 6. Risques techniques à surveiller (extraits du PRD)

- **Conflits d'édition** : ne jamais écrire sans lock ; toujours persister `PageVersion`
  avant diffusion WS. Diff visuel avant toute restauration.
- **Déconnexion WS silencieuse** : heartbeat 30 s côté client + nettoyage serveur.
- **Scalabilité Redis** : standalone pour le MVP, migration Cluster documentée v2.
- **Sécurité SSO/MFA** : secrets TOTP chiffrés au repos ; codes de secours hachés et à usage
  unique ; jeton éphémère de challenge MFA à courte durée de vie (≤ 5 min) et non rejouable ;
  validation stricte des assertions SAML (signature, `Audience`, `NotOnOrAfter`) ; `state`/PKCE
  sur les flux OAuth ; option `require_mfa` par workspace pour les données sensibles.

---

*Prochaine étape suggérée : scaffolder la Phase 1 (socle Django qui démarre sous Docker).*
