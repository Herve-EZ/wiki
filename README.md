# WikiCollab

Wiki collaboratif temps réel pour équipes techniques. Présence live, verrous de
section, historique versionné, self-hosted. Stack : **Astro + Django Channels + Redis + PostgreSQL**.

Voir [`PLAN_TECHNIQUE.md`](./PLAN_TECHNIQUE.md) pour le plan d'implémentation complet.

## État du projet

**Backend : Phases 1 → 4 en place.**

- **Socle** : Django 5 + DRF + Channels + Daphne (HTTP et WebSocket sur un port, via `config/asgi.py`)
- **Base commune** (`core/`) : `BaseModel` abstrait — **PK UUID**, timestamps, et
  **audit trail django-simple-history** hérité par tous les modèles métier
  (tables `Historical*` ; `HistoryRequestMiddleware` attribue chaque changement à son auteur)
- **Auth** : User custom (login email, UUID) + JWT (SimpleJWT)
  - **SSO** via django-allauth : OAuth/OIDC (Google, GitHub, Microsoft) + SAML 2.0
    (SAML activé automatiquement si les libs xmlsec sont présentes — cas du Docker)
  - **MFA** : TOTP + codes de secours à usage unique ; secrets TOTP **chiffrés au repos**
    (Fernet, clé `MFA_ENCRYPTION_KEY`) ; challenge token **à usage unique** (anti-rejeu)
  - Login en deux temps : 1er facteur → `mfa_required` + challenge token → `mfa/verify` → JWT
  - Throttling sur toute la surface d'auth ; désactivation MFA = mot de passe requis
- **Workspaces** : rôles owner/editor/viewer, `require_mfa` par workspace,
  invitations (`POST /workspaces/{slug}/members`), seuls les owners modifient le workspace
- **Pages** (Phase 2) : CRUD, **versioning immuable** (`PageVersion` à chaque save),
  **diff** ligne à ligne (difflib), **restore**, **backlinks**, détection de liens
  (`[[wikilinks]]` + mentions de titres), **recherche full-text** PostgreSQL
- **Temps réel** (Phases 3–4) : présence (join/leave/sync + heartbeat 30 s),
  **verrous de section** (TTL 5 min, refus si pris, libérés à la déconnexion),
  `notify.update` vers les pages liées — persistance **avant** diffusion
- **API docs** : OpenAPI sur `/api/schema/`, Swagger UI sur `/api/docs/`

Reste : Phase 5 (frontend Astro/React) et fin de Phase 6 (déploiement).

## Démarrage rapide (Docker)

```bash
cp .env.example .env          # ajustez les secrets
docker compose up --build     # db + redis + web (+ keycloak pour tester le SAML)
```

L'API est sur http://localhost:8000/api/ — l'admin sur http://localhost:8000/admin/.
Créez un superuser : `docker compose exec web python manage.py createsuperuser`.

### Données de démonstration

Un compte seul n'a aucun espace de travail ni page. La commande `seed_demo` crée
des utilisateurs, un espace « Documentation » et des pages liées avec historique :

```bash
docker compose exec web python manage.py seed_demo
# ou, pour rattacher votre superuser à l'espace de démo :
docker compose exec web python manage.py seed_demo --owner-email vous@exemple.com
```

Elle est idempotente et affiche les identifiants créés (mot de passe par défaut
`wikicollab2026`). Connectez-vous ensuite sur le frontend.

> **Note CORS** : le frontend (Vite, `localhost:5173`) et l'app Tauri sont
> autorisés automatiquement en mode `DEBUG`. Si vous changez `settings.py`,
> rebuildez l'image web (`docker compose up -d --build web`) car le code est
> copié dans l'image, pas monté.

## Développement local (sans Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -e ".[dev]"       # + ".[saml]" si libs xmlsec disponibles (Linux)
python manage.py migrate
python manage.py runserver    # Daphne via ASGI
pytest                        # tests — AUCUN service requis (sqlite + in-memory)
ruff check .                  # lint
```

`pytest` tourne par défaut sur sqlite + cache/canaux en mémoire (voir `conftest.py`).
La CI (`.github/workflows/ci.yml`) rejoue la suite sur PostgreSQL + Redis réels.

## Endpoints principaux

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/auth/register` | Création de compte |
| POST | `/api/auth/token` | Login 1er facteur → JWT ou `mfa_required` |
| POST | `/api/auth/token/refresh` | Rafraîchit l'access token |
| POST | `/api/auth/mfa/verify` | 2e facteur → JWT (challenge à usage unique) |
| POST | `/api/auth/mfa/totp/setup` | Démarre l'enrôlement TOTP (QR) |
| POST | `/api/auth/mfa/totp/activate` | Confirme le TOTP + renvoie les codes de secours |
| DELETE | `/api/auth/mfa/totp` | Désactive le MFA (mot de passe requis) |
| POST | `/api/auth/mfa/recovery-codes` | Régénère les codes de secours |
| GET | `/api/auth/me` | Profil courant |
| GET/POST | `/api/workspaces/` | Liste / crée un workspace |
| GET/POST | `/api/workspaces/{slug}/members/` | Membres / invitation (owner) |
| GET | `/api/workspaces/{slug}/pages/` | Arborescence des pages |
| CRUD | `/api/pages/` | Pages (PATCH ⇒ nouvelle version + liens) |
| GET | `/api/pages/{id}/versions/` `…/versions/{n}` | Historique |
| GET | `/api/pages/{id}/diff/?from=a&to=b` | Diff entre versions |
| POST | `/api/pages/{id}/restore/{n}/` | Restaure (= nouvelle version) |
| GET | `/api/pages/{id}/backlinks/` | Pages qui pointent ici |
| GET | `/api/search?q=…&workspace=…` | Recherche full-text |
| GET | `/api/docs/` | Swagger UI |

SSO : le flux web allauth est monté sous `/accounts/` ; à la fin du flux, l'app
émet une paire JWT (ou un challenge MFA si le compte a un second facteur).

## WebSocket

```
ws://localhost:8000/ws/page/<uuid>/?token=<access_jwt>
```

Refus : `4401` sans JWT valide, `4403` sans accès au workspace, `4404` page inconnue.
Événements : `presence.join|leave|sync`, `heartbeat`(→`heartbeat.ack`),
`lock.acquire|release|denied|sync`, `notify.update`.
