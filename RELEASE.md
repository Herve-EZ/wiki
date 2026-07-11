# Publier une version desktop (Windows + Linux)

Le pipeline [.github/workflows/release.yml](.github/workflows/release.yml)
compile l'application Tauri pour **Windows** (`.msi`, `.exe`) et **Linux**
(`.AppImage`, `.deb`, `.rpm`), signe les artefacts de mise à jour et dépose le
tout dans les **Assets** d'une release GitHub, avec le manifeste `latest.json`
que l'updater intégré interroge.

## Mise en place (une seule fois)

1. **Créer le dépôt GitHub et le remote** (aucun remote n'est configuré pour
   l'instant) :

   ```bash
   git remote add origin https://github.com/Herve-EZ/Wiki.git
   git push -u origin main
   ```

   > Si le dépôt ne s'appelle pas `Herve-EZ/Wiki`, mettre à jour l'endpoint
   > updater dans `frontend/src-tauri/tauri.conf.json`
   > (`plugins.updater.endpoints`).

2. **Ajouter les secrets** dans *Settings → Secrets and variables → Actions* :

   | Secret | Valeur |
   |---|---|
   | `TAURI_SIGNING_PRIVATE_KEY` | contenu du fichier `C:\Users\moubi\.tauri\wikicollab.key` |
   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | *(vide — la clé n'a pas de mot de passe)* |

3. **Sauvegarder la clé privée** (`wikicollab.key`) en lieu sûr. ⚠️ Si elle est
   perdue, les applications déjà installées refuseront toute mise à jour
   (la clé publique correspondante est embarquée dans `tauri.conf.json`).

## Publier une nouvelle version

1. Incrémenter `version` dans `frontend/src-tauri/tauri.conf.json`
   (ex. `0.1.0` → `0.2.0`). C'est la seule version qui compte pour l'updater.
2. Commiter, puis tagger et pousser :

   ```bash
   git commit -am "release: v0.2.0"
   git tag v0.2.0
   git push origin main --tags
   ```

3. Le workflow **Release** construit les deux plateformes et crée une release
   **brouillon** avec tous les assets (+ `latest.json` + signatures `.sig`).
4. Relire, puis **publier** la release sur GitHub. À partir de là :
   - l'app vérifie au démarrage et propose « Installer et redémarrer » ;
   - vérification manuelle possible via **Aide → Rechercher des mises à jour**.

## Notes

- La release reste en brouillon tant qu'elle n'est pas publiée : l'endpoint
  `releases/latest/download/latest.json` ne la voit pas, donc aucune app ne se
  met à jour sur un build incomplet.
- Sous Linux, seul le format **AppImage** se met à jour automatiquement ;
  `.deb`/`.rpm` passent par le gestionnaire de paquets.
- Le workflow se déclenche sur tout tag `v*`, ou manuellement
  (*Actions → Release → Run workflow*).
- En développement (`pnpm tauri dev`), la vérification de mise à jour échoue
  silencieusement : c'est attendu, il n'y a pas de build signé à comparer.
