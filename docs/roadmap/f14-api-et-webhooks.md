# F14 — Jetons API personnels & webhooks sortants

[← Roadmap](ROADMAP.md) · **Cible : v0.10** · **Effort : M**

---

## Objectif & valeur

Ouvrir WikiCollab à l'**automatisation** :

- **Jetons API** : scripts/CI qui lisent ou écrivent des pages sans passer par le flux JWT interactif.
- **Webhooks** : notifier des systèmes externes (Slack, CI, ChatOps) quand une page est **publiée** ou change d'**étape de workflow**.

## Périmètre fonctionnel

**Jetons API personnels**
- *Paramètres → Jetons API* : créer un jeton (nom, date d'expiration optionnelle),
  la valeur n'est affichée **qu'une fois**.
- Lister / **révoquer** ses jetons ; voir « dernière utilisation ».
- Le jeton s'utilise en en-tête `Authorization: Bearer <token>` sur l'API REST,
  avec les **droits de l'utilisateur** qui l'a émis.

**Webhooks (par espace, owner)**
- *Réglages de l'espace → Webhooks* : ajouter une URL cible + les **événements**
  souscrits (`page.published`, `page.workflow_stage`, `page.created`…).
- Secret partagé pour **signer** le payload (HMAC SHA-256, en-tête `X-WikiCollab-Signature`).
- Livraison **après commit** (fiabilité : persister avant diffuser, comme les notifs) ;
  journal des dernières livraisons + statut.

## Conception technique

### Backend
- **Jetons** : modèle `ApiToken(user, name, token_hash, prefix, expires_at, last_used_at)`.
  - Stocker un **hash** du jeton (jamais en clair) ; `prefix` pour l'affichage.
  - Classe d'authentification DRF `ApiTokenAuthentication` (en plus de SimpleJWT) qui
    résout le porteur depuis le hash et pose `request.user`.
  - Endpoints : `GET/POST /api/auth/tokens/`, `DELETE /api/auth/tokens/{id}/`.
- **Webhooks** : modèle `Webhook(workspace, url, secret, events[], active)` +
  `WebhookDelivery(webhook, event, status, response_code, created_at)` (journal).
  - Emission : hooker les points existants — publication de page (`perform_update`
    quand `status→published`), avancement workflow (`notify_workflow_stage`),
    création (`perform_create`).
  - Envoi via `transaction.on_commit` (cohérent avec `services._post_save_notifications`) ;
    idéalement une tâche asynchrone (Channels/worker) avec quelques tentatives.
  - Payload signé HMAC avec `secret`.
  - Endpoints owner : `GET/POST /api/workspaces/{slug}/webhooks/`, `DELETE …/{id}/`,
    `GET …/{id}/deliveries/`.

### Frontend
- *Paramètres* : onglet **Jetons API** (création avec révélation unique, liste, révocation).
- *Réglages de l'espace* : onglet **Webhooks** (CRUD + journal des livraisons).
- Types : `ApiToken`, `Webhook`, `WebhookDelivery`.

### Sécurité
- Jetons : hash au repos, révélation unique, révocation immédiate, expiration.
- Webhooks : signature HMAC, secret non ré-affiché, validation de l'URL (https),
  timeouts + backoff sur l'envoi.

## Impacts
- **Modèles** : `ApiToken`, `Webhook`, `WebhookDelivery` (+ migrations).
- **Auth** : nouvelle `authentication_class` DRF.
- **Endpoints** : tokens (auth), webhooks (owner), deliveries.
- **Front** : 2 nouveaux onglets (Paramètres + Réglages espace).

## Effort & découpage
1. Jetons API : modèle + auth class + endpoints + tests (M/2).
2. Front onglet Jetons API.
3. Webhooks : modèle + émission on_commit + signature + tests.
4. Front onglet Webhooks + journal.

## Dépendances
Auth existante (SimpleJWT), points d'émission existants (publication, workflow, création). L'envoi asynchrone fiable bénéficie d'un worker (Channels déjà présent).

## Risques & décisions ouvertes
- **Fiabilité webhooks** : synchrone `on_commit` (simple) vs file/worker (robuste). Proposé : `on_commit` + petites retries pour la v0.10, worker plus tard.
- **Scope des jetons** : pleins droits utilisateur (proposé) vs scopes fins (plus tard).
- SSRF : restreindre les URL de webhook (schéma https, pas d'IP internes).

## Critères d'acceptation
- [ ] Un jeton créé permet d'appeler l'API REST avec les droits de son porteur ; révoqué, il est refusé.
- [ ] La valeur du jeton n'est affichée qu'à la création et stockée hashée.
- [ ] Publier une page déclenche un webhook signé vers l'URL configurée, journalisé.
- [ ] La configuration des webhooks est réservée au propriétaire.
- [ ] Tests backend : auth par jeton, révocation/expiration, émission + signature webhook.
