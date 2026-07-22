mod commands;
#[cfg(desktop)]
mod menu;

use tauri_plugin_sql::{Migration, MigrationKind};

/// Local mirror schema for the degraded (offline) mode. The desktop app keeps
/// a copy of the pages it has opened plus an outbox of edits made while the
/// server was unreachable; `sync.ts` on the frontend replays the outbox on
/// reconnect. Migrations are append-only and must stay re-runnable.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "local mirror: page_cache + outbox",
            sql: r#"
                CREATE TABLE IF NOT EXISTS page_cache (
                    id             TEXT PRIMARY KEY,
                    workspace      TEXT NOT NULL,
                    title          TEXT NOT NULL,
                    slug           TEXT NOT NULL,
                    content_md     TEXT NOT NULL DEFAULT '',
                    status         TEXT NOT NULL DEFAULT 'draft',
                    base_version   INTEGER,
                    server_updated TEXT,
                    local_updated  TEXT NOT NULL,
                    dirty          INTEGER NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_page_cache_workspace
                    ON page_cache (workspace);

                CREATE TABLE IF NOT EXISTS outbox (
                    seq          INTEGER PRIMARY KEY AUTOINCREMENT,
                    page_id      TEXT NOT NULL,
                    kind         TEXT NOT NULL,           -- 'create' | 'update'
                    payload      TEXT NOT NULL,           -- JSON body
                    base_version INTEGER,                 -- server version edit was based on
                    created_at   TEXT NOT NULL,
                    attempts     INTEGER NOT NULL DEFAULT 0,
                    last_error   TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_outbox_page ON outbox (page_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "page hierarchy + deferred uploads",
            sql: r#"
                ALTER TABLE page_cache ADD COLUMN parent TEXT;

                CREATE TABLE IF NOT EXISTS pending_uploads (
                    id           TEXT PRIMARY KEY,        -- referenced by the `pending:<id>` placeholder
                    workspace    TEXT NOT NULL,           -- workspace slug (upload target)
                    page_id      TEXT NOT NULL,
                    filename     TEXT NOT NULL,
                    content_type TEXT NOT NULL DEFAULT '',
                    data         TEXT NOT NULL,           -- base64 file bytes
                    created_at   TEXT NOT NULL
                );
            "#,
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Single-instance MUST be registered first: when the OS launches the app to
    // open a wikicollab:// deep link while it's already running, the link is
    // forwarded to the live instance (which the frontend picks up via
    // onOpenUrl) instead of starting a second copy.
    #[cfg(desktop)]
    {
        use tauri::Manager;
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:wikicollab.db", migrations())
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // Desktop only: native menu bar + self-update from GitHub Releases.
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
                menu::setup(app)?;
            }
            // Register the wikicollab:// scheme at runtime. The installer wires
            // it on Windows and Info.plist on macOS; this covers dev runs and
            // Linux where runtime registration is required.
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system_info,
            commands::reveal_in_file_manager,
            commands::run_tool,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
