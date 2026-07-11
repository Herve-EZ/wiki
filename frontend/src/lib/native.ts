/**
 * Thin wrappers over the desktop-only native surface: Rust IPC commands, file
 * export via the native save dialog, OS notifications, and opening external
 * URLs (SSO). Every function is a no-op / safe fallback on web.
 */
import { isTauri } from "./platform";

export interface SystemInfo {
  os: string;
  arch: string;
  family: string;
  app_version: string;
}

export interface ToolOutput {
  status: number;
  stdout: string;
  stderr: string;
}

export async function systemInfo(): Promise<SystemInfo | null> {
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<SystemInfo>("system_info");
}

export async function revealInFileManager(path: string): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("reveal_in_file_manager", { path });
}

/** Run an allow-listed external tool (git, pandoc) via the trusted Rust path. */
export async function runTool(
  name: "git" | "pandoc",
  args: string[],
  cwd?: string,
): Promise<ToolOutput> {
  if (!isTauri()) throw new Error("External tools require the desktop app");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ToolOutput>("run_tool", { name, args, cwd: cwd ?? null });
}

/** Export markdown to a user-chosen file. Returns the saved path, or null. */
export async function exportMarkdown(
  defaultName: string,
  content: string,
): Promise<string | null> {
  if (!isTauri()) {
    // Web fallback: trigger a browser download.
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(a.href);
    return defaultName;
  }
  const [{ save }, { writeTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!path) return null;
  await writeTextFile(path, content);
  return path;
}

export async function notify(title: string, body: string): Promise<void> {
  if (!isTauri()) return;
  const mod = await import("@tauri-apps/plugin-notification");
  let granted = await mod.isPermissionGranted();
  if (!granted) granted = (await mod.requestPermission()) === "granted";
  if (granted) mod.sendNotification({ title, body });
}

export async function openExternal(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { open } = await import("@tauri-apps/plugin-shell");
  await open(url);
}
