# 14. FAQ & dépannage

[← Administration](13-administration.md) · [Retour au sommaire](README.md)

---

## Connexion & compte

**Je ne vois aucun moyen de me connecter.**
Le message *« Aucune méthode de connexion n'est configurée. Contactez votre
administrateur système. »* signifie que la connexion email et le SSO sont tous
désactivés. → [Administration](13-administration.md).

**« Email ou mot de passe incorrect. »**
Vérifiez la casse et la disposition du clavier. Après plusieurs échecs, un message
*« Trop de tentatives. Réessayez plus tard. »* peut apparaître : patientez un instant.

**« Serveur injoignable. Vérifiez votre connexion. »**
L'instance est hors ligne ou votre réseau est coupé. Réessayez plus tard.

**Je n'ai pas de lien « Créer un compte ».**
La création de compte est désactivée par l'administrateur. Demandez une invitation à
un propriétaire d'espace.

**Mon mot de passe est refusé à l'inscription.**
Il doit faire **au moins 8 caractères** et l'email ne doit pas déjà être utilisé.

---

## Double authentification (2FA)

**J'ai perdu mon téléphone.**
Utilisez un **code de récupération** : sur l'écran 2FA, cliquez sur *« Utiliser un code
de secours ou revenir »*. → [Compte & sécurité](02-compte-et-securite.md).

**« Code invalide ou expiré. »**
Le code TOTP change toutes les 30 s ; vérifiez l'heure de votre téléphone. Le jeton de
vérification est **valable 5 minutes** et **à usage unique**.

**Un espace est inaccessible : il « exige la 2FA ».**
Activez la double authentification dans *Paramètres → Sécurité & 2FA*.

---

## Pages & édition

**Je ne peux pas éditer une section (« [Nom] édite cette section »).**
Elle est **verrouillée** par un collègue. Attendez qu'il enregistre/annule, ou que le
verrou expire. → [Collaboration temps réel](05-collaboration-temps-reel.md).

**« Section verrouillée par [Nom]. »**
Idem : quelqu'un y travaille déjà. Une seule personne édite une section à la fois.

**« Action non autorisée par votre rôle. »**
Votre rôle ne permet pas cette action (ex. publier en tant qu'éditeur). →
[Rôles](03-espaces-de-travail.md#les-rôles).

**Je ne peux pas publier / archiver / supprimer.**
Ces actions sont réservées au **propriétaire**.

**Mon wikilien ne pointe nulle part.**
Vérifiez le titre ou le slug exact entre `[[ ]]` (insensible à la casse, même espace).
Si la page n'existe pas encore et que vous avez les droits, cliquer dessus propose de
la créer. → [Wikiliens](04-rediger-des-pages.md#lier-des-pages-entre-elles-wikiliens).

---

## Temps réel & synchronisation

**« Temps réel indisponible — mode dégradé. »**
Vous êtes hors-ligne : présence et verrous sont désactivés, mais vous pouvez lire et
éditer (bureau). → [Hors-ligne](10-hors-ligne-et-synchro.md).

**Mes modifications ne partent pas.**
Regardez le bouton de synchro : *N en attente* (à envoyer) ou *N à résoudre*
(conflits). Cliquez pour synchroniser, ou ouvrez *« Résoudre »*.

**« N modification(s) bloquée(s). »**
Des conflits attendent une décision (souvent : page supprimée sur le serveur). Ouvrez
**« Résoudre »** et choisissez *Supprimer* ou *Recréer* pour chacune. →
[Résoudre les conflits](10-hors-ligne-et-synchro.md#résoudre-les-conflits).

**« Page indisponible hors-ligne (jamais ouverte sur cet appareil). »**
Seules les pages déjà consultées sont en cache. Ouvrez-la une fois en ligne pour la
rendre disponible hors-ligne ensuite.

---

## Notifications

**Je ne reçois pas de notifications système.**
Sur le bureau, autorisez les notifications au premier usage ; vérifiez aussi les
réglages de votre OS. Les notifications système n'arrivent que **fenêtre en arrière-plan**.

**Je reçois trop / pas assez de notifications.**
Ajustez *Paramètres → Notifications* (réglage **par appareil**). →
[Notifications](09-notifications.md).

---

## Mises à jour (bureau)

**« Impossible de vérifier les mises à jour. »**
Problème de connexion : réessayez. Vous pouvez aussi télécharger la dernière version
depuis la page des releases GitHub.

**Le téléchargement de la mise à jour a échoué.**
Réessayez, ou installez manuellement depuis GitHub. Les mises à jour sont vérifiées par
signature avant installation.

---

## Où l'application stocke-t-elle mes données ?

- **En ligne** : sur votre instance auto-hébergée (serveur de votre organisation).
- **Bureau** : un **miroir local** (cache SQLite) des pages ouvertes + une file
  d'attente pour le hors-ligne. Les préférences de notifications et de thème sont
  stockées **localement, par appareil**.

---

## Toujours bloqué ?

- Consultez l'aide intégrée : icône **?** dans le pied de la barre latérale.
- Contactez votre **administrateur système** ou l'**adresse de support** de l'instance
  (définie dans [Administration → Identité](13-administration.md)).

[← Administration](13-administration.md) · [Retour au sommaire](README.md) · [Raccourcis clavier →](15-raccourcis-clavier.md)
