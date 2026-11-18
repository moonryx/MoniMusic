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

/// La página avisa el color de la canción cambiando un instante su título a "mk-titlebar:rrggbb"
/// (o "mk-titlebar:default"); con eso se pinta la barra de título de Windows del mismo color.
const BAR_MARK: &str = "mk-titlebar:";

#[cfg(windows)]
mod titlebar {
    use std::ffi::c_void;

    #[link(name = "dwmapi")]
    extern "system" {
        fn DwmSetWindowAttribute(hwnd: *mut c_void, attribute: u32, value: *const c_void, size: u32) -> i32;
    }

    const DWMWA_BORDER_COLOR: u32 = 34;
    const DWMWA_CAPTION_COLOR: u32 = 35;
    const DWMWA_TEXT_COLOR: u32 = 36;
    const DWMWA_COLOR_DEFAULT: u32 = 0xFFFF_FFFF;

    /// `color`: "rrggbb" o "default". Solo tiene efecto en Windows 11; en Windows 10 se ignora.
    pub fn paint(hwnd: *mut c_void, color: &str) {
        let (caption, text) = match parse(color) {
            Some((r, g, b)) => {
                let light = (299 * r as u32 + 587 * g as u32 + 114 * b as u32) / 1000 > 150;
                // Windows quiere el color como 0x00BBGGRR
                let caption = ((b as u32) << 16) | ((g as u32) << 8) | r as u32;
                (caption, if light { 0x0010_1010 } else { 0x00FF_FFFF })
            }
            None => (DWMWA_COLOR_DEFAULT, DWMWA_COLOR_DEFAULT),
        };
        for (attribute, value) in [
            (DWMWA_CAPTION_COLOR, caption),
            (DWMWA_BORDER_COLOR, caption),
            (DWMWA_TEXT_COLOR, text),
        ] {
            unsafe {
                DwmSetWindowAttribute(hwnd, attribute, &value as *const u32 as *const c_void, 4);
            }
        }
    }

    fn parse(color: &str) -> Option<(u8, u8, u8)> {
        if color.len() != 6 || !color.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return None;
        }
        let number = u32::from_str_radix(color, 16).ok()?;
        Some(((number >> 16) as u8, (number >> 8) as u8, number as u8))
    }
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
                .on_document_title_changed(|window, title| {
                    if let Some(color) = title.strip_prefix(BAR_MARK) {
                        #[cfg(windows)]
                        if let Ok(hwnd) = window.hwnd() {
                            titlebar::paint(hwnd.0 as *mut std::ffi::c_void, color.trim());
                        }
                        #[cfg(not(windows))]
                        let _ = (&window, color);
                    }
                })
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
