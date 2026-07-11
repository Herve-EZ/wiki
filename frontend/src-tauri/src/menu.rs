//! Native application menu (desktop only).
//!
//! The menu itself lives on the Rust side so it renders as a real OS menu bar.
//! Items that need app context (navigation, modals, update check) just emit a
//! `menu:action` event with the item id; `MenuBridge.tsx` on the frontend
//! listens and reacts. Purely native concerns (clipboard, quit) are handled
//! here via predefined items and never reach the webview.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{App, Emitter, Runtime};

/// Item ids forwarded to the frontend. Keep in sync with `MenuBridge.tsx`.
const FORWARDED: &[&str] = &[
    "new-page",
    "search",
    "export-page",
    "settings",
    "help",
    "check-updates",
    "about",
    "credits",
];

pub fn setup<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let h = app.handle();

    let fichier = Submenu::with_items(
        h,
        "Fichier",
        true,
        &[
            &MenuItem::with_id(h, "new-page", "Nouvelle page", true, Some("CmdOrCtrl+N"))?,
            &MenuItem::with_id(h, "search", "Rechercher…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(h)?,
            &MenuItem::with_id(h, "export-page", "Exporter la page…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(h)?,
            &PredefinedMenuItem::quit(h, Some("Quitter"))?,
        ],
    )?;

    let edition = Submenu::with_items(
        h,
        "Édition",
        true,
        &[
            &PredefinedMenuItem::undo(h, Some("Annuler"))?,
            &PredefinedMenuItem::redo(h, Some("Rétablir"))?,
            &PredefinedMenuItem::separator(h)?,
            &PredefinedMenuItem::cut(h, Some("Couper"))?,
            &PredefinedMenuItem::copy(h, Some("Copier"))?,
            &PredefinedMenuItem::paste(h, Some("Coller"))?,
            &PredefinedMenuItem::select_all(h, Some("Tout sélectionner"))?,
        ],
    )?;

    let parametres = Submenu::with_items(
        h,
        "Paramètres",
        true,
        &[&MenuItem::with_id(h, "settings", "Préférences…", true, Some("CmdOrCtrl+,"))?],
    )?;

    let aide = Submenu::with_items(
        h,
        "Aide",
        true,
        &[
            &MenuItem::with_id(h, "help", "Aide en ligne", true, Some("F1"))?,
            &PredefinedMenuItem::separator(h)?,
            &MenuItem::with_id(h, "check-updates", "Rechercher des mises à jour…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(h)?,
            &MenuItem::with_id(h, "about", "Version de l'application", true, None::<&str>)?,
            &MenuItem::with_id(h, "credits", "Crédits", true, None::<&str>)?,
        ],
    )?;

    let menu = Menu::with_items(h, &[&fichier, &edition, &parametres, &aide])?;
    app.set_menu(menu)?;

    app.on_menu_event(|app, event| {
        let id = event.id().as_ref();
        if FORWARDED.contains(&id) {
            // Best effort: the frontend may not be mounted yet during startup.
            let _ = app.emit("menu:action", id);
        }
    });

    Ok(())
}
