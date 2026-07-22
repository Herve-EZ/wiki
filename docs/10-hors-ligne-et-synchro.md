# 10. Hors-ligne & synchronisation

[← Notifications](09-notifications.md) · [Retour au sommaire](README.md)

---

L'**application de bureau** vous laisse consulter et modifier vos pages **sans
connexion**. Vos modifications sont mises en file d'attente localement, puis
**synchronisées automatiquement** au retour du réseau — sans jamais écraser le travail
d'un collègue en silence.

> Le mode hors-ligne complet (cache local) est une fonction de **l'application de
> bureau**. Sur le web, un message l'indique : *Le mode hors-ligne complet (cache
> local) est disponible dans l'application de bureau.*

---

## Que veut dire « en ligne » ?

L'application se considère en ligne **seulement si** votre système a du réseau **et**
que la dernière requête vers le serveur a réussi. Si votre machine a du Wi-Fi mais que
le serveur est injoignable, vous êtes donc correctement affiché **hors-ligne**.

---

## Éditer hors-ligne

Hors-ligne (ou en mode forcé), la lecture se fait depuis le **cache local** et vos
modifications sont empilées dans une **file d'attente** (l'« outbox »), au lieu d'être
perdues. Un enregistrement hors-ligne affiche : *Enregistré en local — synchronisation
au retour du réseau.*

> Seules les pages **déjà ouvertes** sur cet appareil sont en cache. Une page jamais
> consultée affiche hors-ligne : *Page indisponible hors-ligne (jamais ouverte sur cet
> appareil).*

---

## Forcer le mode hors-ligne

**Paramètres → Synchronisation** (bureau) : l'interrupteur **« Travailler
hors-ligne »** force le mode déconnecté (*Force le mode hors-ligne : lecture depuis le
cache local, modifications mises en file d'attente.*). Ce réglage persiste au
redémarrage.

---

## Suivre l'état de synchronisation

### Le bouton de synchronisation (barre latérale)

Toujours visible en bas de la barre latérale, son libellé reflète l'état :

| État | Libellé |
|---|---|
| Synchronisation en cours | *Synchronisation…* |
| Hors-ligne | *Hors-ligne* |
| Conflits à traiter | *N à résoudre* |
| Modifications en attente | *N en attente* |
| Tout est synchronisé | *À jour* |

Un clic lance la synchronisation : envoi de la file d'attente, puis rechargement des
données du serveur.

### Le panneau Synchronisation (Paramètres)

**Paramètres → Synchronisation** affiche des pastilles d'état :

- **En ligne** / **Hors-ligne** ;
- **N en attente** (modifications à envoyer) ;
- **N conflit(s)** ;
- **dernière synchro** (heure de la dernière synchro réussie, ou *—*).

Bouton **« Synchroniser maintenant »** (*La synchronisation envoie vos modifications
locales et recharge les données du serveur.*).

### Le bandeau hors-ligne (haut de l'espace)

Il n'apparaît que s'il y a quelque chose à signaler :

- **Hors-ligne avec modifications locales** : *Mode dégradé — vos modifications sont enregistrées en local.*
- **En ligne avec conflits** : *N modification(s) bloquée(s) (page introuvable ou en conflit).* + lien **« Résoudre »**.
- **En ligne avec modifications en attente** : *N modification(s) en attente de synchronisation.* + lien **« Synchroniser maintenant »**.

---

## Que se passe-t-il à la reconnexion ?

La file d'attente est **rejouée dans l'ordre**. Pour chaque modification :

- **Succès** → envoyée et retirée de la file ; le compteur *en attente* baisse.
- **Toujours hors-ligne** → la synchro s'arrête, la modification reste en file pour la prochaine tentative.
- **Refus du serveur** (conflit, ou page supprimée) → la modification est **marquée en conflit** et **conservée**, pour que vous décidiez quoi en faire.

> **Jamais d'écrasement silencieux.** La synchro se relance aussi **automatiquement**
> au retour du réseau. Les compteurs se rafraîchissent tout seuls.

---

## Résoudre les conflits

Un **conflit** est une modification qui n'a pas pu être envoyée. Cas le plus fréquent :
la page a été **supprimée sur le serveur** pendant que vous l'éditiez hors-ligne.

Cliquez sur **« Résoudre »** (bandeau) — ou sur le bouton *N à résoudre* — pour ouvrir
la fenêtre **« Modifications bloquées »**. Chaque carte affiche le titre de la page et
la raison :

- *Cette page n'existe plus sur le serveur.* (page supprimée)
- *Conflit : [détail]* (autre conflit)

Deux actions par carte :

- **« Supprimer »** — abandonne la modification localement (oublie la page du cache).
- **« Recréer »** — recrée la page sur le serveur à partir de votre copie locale
  (titre + contenu + statut).

> S'il n'y a rien à traiter : *Aucune modification bloquée. 🎉*

---

## Page supprimée sur le serveur : le dialogue « Page introuvable »

Si vous ouvrez une page qui a été supprimée côté serveur, une fenêtre **« Page
introuvable »** apparaît : *Cette page n'existe plus sur le serveur (elle a
probablement été supprimée). Que souhaitez-vous faire ?*

- **« Recréer la page »** — la recrée depuis votre copie locale (bureau, si une copie existe).
- **« Supprimer / oublier cette page »** — oublie la copie locale et revient à l'espace.

[← Notifications](09-notifications.md) · [Retour au sommaire](README.md) · [Export →](11-export.md)
