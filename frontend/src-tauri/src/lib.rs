mod commands;

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
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
