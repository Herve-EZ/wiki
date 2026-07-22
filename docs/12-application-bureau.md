# 12. Application de bureau

[← Export](11-export.md) · [Retour au sommaire](README.md)

---

L'application de bureau (Windows, macOS, Linux) partage tout le code de la version web,
et ajoute des capacités natives : **cache local**, **mode hors-ligne complet**,
**notifications système**, **menus natifs** et **mises à jour automatiques**.

---

## Menus natifs

L'application dispose d'un **menu système** relié à l'interface. Les entrées déclenchent :

| Menu | Action |
|---|---|
| **Préférences / Paramètres** | Ouvre les Paramètres |
| **Aide** | Ouvre l'aide |
| **Aide → Version de l'application** | Fenêtre *Version* (voir ci-dessous) |
| **Aide → Crédits** | Fenêtre *Crédits* |
| **Rechercher des mises à jour** | Lance une vérification manuelle |
| **Fichier → Nouvelle page** | Crée une page |
| **Fichier → Rechercher** | Ouvre la recherche |
| **Fichier → Exporter la page…** | Ouvre le menu d'export de la page courante |

---

## La fenêtre « À propos »

Depuis le menu **Aide**, deux vues :

### Version de l'application

- Sous-titre : **« Version X.Y.Z »** (ou *Version web* dans le navigateur).
- Section *Détails* : **« Système : [OS] ([architecture]) »**.
- Bouton **« Rechercher des mises à jour »**.

### Crédits

- *« Conçu et développé par **EZ Audiovisuel**. »*
- *« Construit avec Tauri, React, Django Channels et PostgreSQL. Distribué sous licence MIT. »*
- Lien **« Code source sur GitHub »**.

---

## Mises à jour automatiques

L'application vérifie les nouvelles versions **peu après le lancement** (environ 3
secondes), et vous pouvez aussi lancer une vérification manuelle
(*Aide → Rechercher des mises à jour*).

### Résultat d'une vérification manuelle

- À jour : *« Vous utilisez déjà la dernière version de WikiCollab. »*
- Échec : *« Impossible de vérifier les mises à jour. Vérifiez votre connexion et réessayez. »*

### Quand une mise à jour est disponible

Une fenêtre **« Mise à jour disponible »** s'ouvre :

> *WikiCollab [nouvelle version] est disponible (vous utilisez la [version actuelle]).*

Elle affiche les **notes de version** et deux boutons :

- **« Plus tard »** — reporte.
- **« Installer et redémarrer »** — télécharge, installe, puis redémarre.

Déroulé : *Téléchargement… N%* → *Installation… l'application va redémarrer.*

> Les mises à jour sont **vérifiées par signature** avant installation.
> En cas d'échec : *« Échec du téléchargement de la mise à jour. Réessayez plus tard ou
> téléchargez-la depuis la page des releases GitHub. »* (le bouton devient *Réessayer*).

---

## Capacités natives

Sur le bureau, ces fonctions sont natives (et se replient proprement sur le web) :

- **Export Markdown / fichiers** — boîte de dialogue « Enregistrer » native (téléchargement navigateur sur le web).
- **Notifications système** — bannières de l'OS (demande d'autorisation au premier usage).
- **Ouverture de liens externes** — dans le navigateur système (SSO, GitHub…).
- **Cache local (SQLite)** et **file d'attente hors-ligne** — voir [Hors-ligne & synchronisation](10-hors-ligne-et-synchro.md).

---

## Web vs bureau : récapitulatif

| Fonction | Bureau | Web |
|---|:---:|:---:|
| Édition, temps réel, historique, recherche | ✓ | ✓ |
| Cache local + hors-ligne complet | ✓ | — |
| Notifications système (OS) | ✓ | notifications dans l'app |
| Menus natifs | ✓ | — |
| Mises à jour automatiques | ✓ | rechargez la page |
| Boîte « Enregistrer » native | ✓ | téléchargement navigateur |

[← Export](11-export.md) · [Retour au sommaire](README.md) · [Administration →](13-administration.md)
