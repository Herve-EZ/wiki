# 2. Compte & sécurité

[← Rédaction précédente](01-demarrage.md) · [Retour au sommaire](README.md)

---

Ce guide couvre la connexion, le SSO, la double authentification (2FA), votre profil
et votre mot de passe. Tout se gère depuis l'écran **Paramètres** (icône ⚙️ dans le
pied de la barre latérale, ou votre carte de profil).

---

## Se connecter

### Email / mot de passe

Sur l'écran de connexion, renseignez **Adresse email** et **Mot de passe**, puis
**« Se connecter »**.

Messages possibles :

| Situation | Message affiché |
|---|---|
| Identifiants erronés | *Email ou mot de passe incorrect.* |
| Trop de tentatives | *Trop de tentatives. Réessayez plus tard.* |
| Serveur injoignable | *Serveur injoignable. Vérifiez votre connexion.* |

### SSO (Google, GitHub, Microsoft, SAML)

Si votre administrateur a activé un fournisseur, un bouton apparaît sous
**« ou continuer avec »**. En cliquant :

1. La page de connexion du fournisseur s'ouvre dans votre navigateur.
2. Vous vous y authentifiez.
3. Vous êtes automatiquement ramené dans l'application, connecté.

> Si votre compte SSO a la 2FA activée, vous passerez quand même par l'écran de
> vérification à 6 chiffres avant d'entrer.

### Créer un compte

Si la création de compte est autorisée : cliquez sur **« Créer un compte »**,
renseignez **Nom affiché**, **Adresse email** et **Mot de passe**
(**8 caractères minimum**), puis **« Créer mon compte »**. Vous êtes connecté dans la foulée.

---

## Double authentification (2FA / TOTP)

La 2FA ajoute un **second facteur** : après votre mot de passe, l'application demande
un code à 6 chiffres généré par une application d'authentification
(Google Authenticator, Authy, etc.).

### Activer la 2FA

1. Ouvrez **Paramètres → Sécurité & 2FA**.
2. Dans la carte *Double authentification (2FA)*, l'état affiche **« Inactive »**. Cliquez sur **« Activer la 2FA »**.
3. **Scannez le QR code** avec votre application d'authentification.
   *(Vous ne pouvez pas scanner ? Une **clé manuelle** est affichée sous le QR code : saisissez-la à la main dans votre application.)*
4. Saisissez le **code à 6 chiffres** affiché par l'application.
5. Cliquez sur **« Confirmer »**.

Un encadré **« Codes de récupération — conservez-les en lieu sûr »** apparaît alors.

### Conserver vos codes de récupération

Les **codes de récupération** vous permettent de vous connecter même si vous perdez
votre téléphone. Copiez-les et gardez-les en lieu sûr (gestionnaire de mots de passe,
coffre-fort…).

- Vous pouvez en **régénérer** à tout moment : *Paramètres → Sécurité & 2FA → « Régénérer les codes de secours »*. Les anciens codes deviennent alors invalides.

### Se connecter avec la 2FA activée

Après avoir saisi votre mot de passe (ou passé le SSO), l'écran
**« Vérification en deux étapes »** apparaît :

1. Saisissez le **code à 6 chiffres** de votre application (les champs avancent tout seuls).
2. Cliquez sur **« Vérifier et ouvrir l'espace »**.

> Le jeton de vérification est **à usage unique** et **valable 5 minutes**.
> Pas de téléphone sous la main ? Le lien **« Utiliser un code de secours ou revenir »**
> vous ramène au formulaire pour saisir un **code de récupération**.

### Désactiver la 2FA

1. **Paramètres → Sécurité & 2FA**.
2. Saisissez votre mot de passe dans le champ **« Mot de passe (pour désactiver) »**.
3. Cliquez sur **« Désactiver la 2FA »**.

> ⚠️ Certains espaces **exigent la 2FA** (voir [Espaces de travail](03-espaces-de-travail.md)).
> Sans second facteur, leur contenu vous devient inaccessible.

---

## Modifier votre profil

**Paramètres → Profil** :

- **Photo de profil** — cliquez sur **« Choisir une image… »** (JPG, PNG ou GIF, **5 Mo max**).
- **Nom affiché** — le nom vu par vos collègues.
- Cliquez sur **« Enregistrer »** (message *Profil mis à jour.*).

---

## Changer de mot de passe

**Paramètres → Sécurité & 2FA**, carte *Mot de passe* :

1. Saisissez le **Mot de passe actuel** et le **Nouveau mot de passe** (**8+ caractères**).
2. Cliquez sur **« Changer le mot de passe »** (message *Mot de passe changé.*).

---

## Préférences de notifications

**Paramètres → Notifications** — quatre interrupteurs (tous activés par défaut) :

- **Invitations à un workspace** — quand vous recevez une invitation.
- **Mentions @** — quand quelqu'un vous mentionne dans une page.
- **Pages suivies** — quand une page que vous suivez est modifiée.
- **Changements de workflow** — quand une page change d'étape.

> Ces préférences sont enregistrées **localement sur cet appareil** (elles ne suivent
> pas votre compte d'un appareil à l'autre).

Voir [Notifications](09-notifications.md).

---

## Bonnes pratiques de sécurité

- Activez la **2FA** dès que possible.
- Stockez vos **codes de récupération** hors de votre téléphone.
- Utilisez un **mot de passe unique** d'au moins 8 caractères (plus, c'est mieux).
- Sur un poste partagé, pensez à **vous déconnecter** (icône ⎋ dans le pied de la barre latérale).

[← Démarrage](01-demarrage.md) · [Retour au sommaire](README.md) · [Espaces de travail →](03-espaces-de-travail.md)
