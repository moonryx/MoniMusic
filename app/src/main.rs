// MoniMusic — app de escritorio en Rust (Tauri).
// Abre YouTube Music en una ventana propia e inyecta el tema, el panel de diseño y la letra en vivo.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Theme, Url, WebviewUrl, WebviewWindowBuilder};

/// Lo que se inyecta en la página (lo genera tools/build-app.js).
const INJECT: &str = include_str!("inject.js");
const HOME: &str = "https://music.youtube.com/";

/// Sitios que se abren dentro de la app: YouTube Music y el inicio de sesión de Google.
const INSIDE: [&str; 6] = [
    "youtube.com",
    "google.com",
    "gstatic.com",
    "googleusercontent.com",
    "googlevideo.com",
    "youtu.be",
];

fn stays_inside(url: &Url) -> bool {
    let Some(host) = url.host_str() else {
        return true; // about:blank, blob:, data:
    };
    let host = host.to_ascii_lowercase();
    INSIDE
        .iter()
        .any(|site| host == *site || host.ends_with(&format!(".{site}")))
        // accounts.google.com.gt y similares
        || host.contains(".google.")
}

fn open_in_browser(url: &Url) {
    let _ = std::process::Command::new("rundll32")
        .args(["url.dll,FileProtocolHandler", url.as_str()])
        .spawn();
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let home: Url = HOME.parse().expect("dirección de inicio válida");
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(home))
                .title("MoniMusic")
                .inner_size(1320.0, 860.0)
                .min_inner_size(480.0, 560.0)
                .theme(Some(Theme::Dark))
                .initialization_script(INJECT)
                .on_navigation(|url| {
                    if stays_inside(url) {
                        return true;
                    }
                    // Los enlaces a otros sitios se abren en el navegador normal.
                    if matches!(url.scheme(), "http" | "https") {
                        open_in_browser(url);
                    }
                    false
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar MoniMusic");
}
