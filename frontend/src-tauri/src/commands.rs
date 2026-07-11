//! Native commands exposed to the React frontend via Tauri IPC.
//!
//! These are the trusted-side operations the webview cannot do on its own:
//! revealing a file in the OS file manager, reporting host info, and running a
//! strictly allow-listed set of external tools (git, pandoc) for import/export.
//!
//! External tools are ALSO reachable from JS through the shell plugin, but only
//! within the scope declared in `capabilities/default.json`. This Rust command
//! is the belt-and-suspenders path: the allow-list lives in code and cannot be
//! widened from the frontend.

use std::process::Command;

use serde::Serialize;

/// Tools the app is ever allowed to spawn. Anything else is refused outright.
const ALLOWED_TOOLS: &[&str] = &["git", "pandoc"];

#[derive(Serialize)]
pub struct SystemInfo {
    os: String,
    arch: String,
    family: String,
    app_version: String,
}

#[derive(Serialize)]
pub struct ToolOutput {
    status: i32,
    stdout: String,
    stderr: String,
}

#[tauri::command]
pub fn system_info() -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        family: std::env::consts::FAMILY.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

/// Open the OS file manager with `path` selected (or its parent folder shown).
#[tauri::command]
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let result = if cfg!(target_os = "windows") {
        Command::new("explorer").arg("/select,").arg(&path).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg("-R").arg(&path).spawn()
    } else {
        // Linux: no universal "select" flag — open the containing directory.
        let dir = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or(path.clone());
        Command::new("xdg-open").arg(dir).spawn()
    };
    result.map(|_| ()).map_err(|e| e.to_string())
}

/// Run one of the allow-listed external tools and capture its output.
/// Returns an error string if the tool is not on the allow-list or fails to
/// launch; a non-zero exit status is reported inside `ToolOutput.status`.
#[tauri::command]
pub fn run_tool(
    name: String,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<ToolOutput, String> {
    if !ALLOWED_TOOLS.contains(&name.as_str()) {
        return Err(format!("Tool '{name}' is not allow-listed"));
    }
    let mut cmd = Command::new(&name);
    cmd.args(&args);
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    let output = cmd.output().map_err(|e| format!("Failed to run {name}: {e}"))?;
    Ok(ToolOutput {
        status: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}
