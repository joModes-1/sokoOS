//! SokoOS Desktop — native shell.
//!
//! Rust is used for native platform capabilities only (see the desktop architecture
//! doc). Business logic stays in the existing NestJS backend, and the React frontend
//! owns the UI. The command surface here is intentionally tiny and read-only.

use serde::Serialize;

/// Minimal, non-sensitive app metadata exposed to the frontend.
#[derive(Serialize)]
pub struct AppInfo {
    /// Operating system family, e.g. "windows", "macos", "linux".
    pub platform: String,
    /// Application version from Cargo.toml.
    pub version: String,
    /// CPU architecture, e.g. "x86_64", "aarch64".
    pub arch: String,
}

/// Returns static app/environment information. No filesystem, shell or network access.
#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        platform: std::env::consts::OS.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("error while running SokoOS Desktop");
}
