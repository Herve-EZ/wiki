# Documentation WikiCollab

**WikiCollab** est un wiki collaboratif en temps réel pour les équipes techniques :
présence en direct, verrous de section, historique versionné, mode hors-ligne et
**auto-hébergement** — vos données restent chez vous.

L'application existe en deux versions à partir du même code :

- **Application de bureau** (Windows, macOS, Linux) — cache local, mode hors-ligne complet, notifications système, mises à jour automatiques.
- **Application web** (navigateur) — mode en ligne uniquement.

Cette documentation sert aussi de **démonstration** : elle décrit chaque écran, chaque
bouton et chaque parcours tel que vous le voyez à l'écran.

---

## Sommaire

### Prise en main
- [1. Démarrage & première connexion](01-demarrage.md)
- [2. Compte & sécurité (SSO, 2FA, profil)](02-compte-et-securite.md)
- [3. Espaces de travail, rôles & membres](03-espaces-de-travail.md)

### Utilisation au quotidien
- [4. Rédiger des pages (sections, wikiliens, mentions)](04-rediger-des-pages.md)
- [5. Collaboration en temps réel (présence & verrous)](05-collaboration-temps-reel.md)
- [6. Historique & versions (diff, restauration)](06-historique-et-versions.md)
- [7. Recherche](07-recherche.md)
- [8. Workflows de validation](08-workflows.md)
- [9. Notifications](09-notifications.md)

### Fonctions avancées
- [10. Hors-ligne & synchronisation](10-hors-ligne-et-synchro.md)
- [11. Export (PDF, Word, Markdown)](11-export.md)
- [12. Application de bureau (mises à jour, menus natifs)](12-application-bureau.md)

### Administration & support
- [13. Administration système](13-administration.md)
- [14. FAQ & dépannage](14-faq-et-depannage.md)
- [15. Raccourcis clavier](15-raccourcis-clavier.md)

---

## Vue d'ensemble en 30 secondes

| Vous voulez… | Allez à |
|---|---|
| Vous connecter pour la première fois | [Démarrage](01-demarrage.md) |
| Activer la double authentification | [Compte & sécurité](02-compte-et-securite.md) |
| Créer un espace et inviter des collègues | [Espaces de travail](03-espaces-de-travail.md) |
| Écrire une page et lier d'autres pages | [Rédiger des pages](04-rediger-des-pages.md) |
| Voir qui édite en même temps que vous | [Collaboration temps réel](05-collaboration-temps-reel.md) |
| Revenir à une ancienne version | [Historique & versions](06-historique-et-versions.md) |
| Travailler sans connexion | [Hors-ligne & synchronisation](10-hors-ligne-et-synchro.md) |
| Exporter une page en PDF ou Word | [Export](11-export.md) |

---

## Rôles en un coup d'œil

| Action | Lecteur | Éditeur | Propriétaire |
|---|:---:|:---:|:---:|
| Lire les pages | ✓ | ✓ | ✓ |
| Créer / modifier (brouillon) | — | ✓ | ✓ |
| Publier / archiver | — | — | ✓ |
| Supprimer une page | — | — | ✓ |
| Gérer les membres | — | — | ✓ |
| Réglages, workflows, suppression de l'espace | — | — | ✓ |

> Les permissions sont vérifiées **côté serveur** : masquer un bouton n'est qu'un
> confort d'interface, jamais une faille.

---

*Conçu et développé par **EZ Audiovisuel**. Construit avec Tauri, React, Django
Channels et PostgreSQL. Distribué sous licence MIT.*
