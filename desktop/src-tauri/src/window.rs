use tauri::Manager;
use url::Url;

use crate::window_common::{focus_existing_window, BROWSER_USER_AGENT};
use crate::window_nav::{create_tab_script, generate_post_form_js, trusted_navigation};

const FORUM_URL: &str = "https://bbs.upkk.com";
const FORUM_TAB_MANAGER_JS: &str = include_str!("../js/forum_tab_manager.js");

fn inject_tab_manager(window: &tauri::WebviewWindow, url: &str, log_prefix: &str) {
    if url == "about:blank" {
        return;
    }
    println!("[{log_prefix}] Page loaded: {url}, injecting tab manager");
    if let Err(error) = window.eval(FORUM_TAB_MANAGER_JS) {
        eprintln!("[{log_prefix}] Failed to inject tab manager: {error}");
    }
}

fn deny_popup_and_open_tab(
    app: &tauri::AppHandle,
    window_label: &str,
    url: &Url,
    log_prefix: &str,
) {
    println!("[{log_prefix}] New window request intercepted: {url}");
    if let Some(target) = app.get_webview_window(window_label) {
        if let Err(error) = target.eval(create_tab_script(url)) {
            eprintln!("[{log_prefix}] Failed to create new tab: {error}");
        }
    }
}

#[tauri::command]
pub async fn open_forum_window(app: tauri::AppHandle) -> Result<(), String> {
    open_url_in_browser_window(
        app,
        "forum".to_string(),
        FORUM_URL.to_string(),
        "Upkk 社区论坛".to_string(),
    )
    .await
}

#[tauri::command]
pub async fn open_forum_with_login(
    app: tauri::AppHandle,
    uid: String,
    auth: String,
) -> Result<(), String> {
    let login_url = "https://bbs.upkk.com/plugin.php?id=xnet_core_api:xproj_login_to_bbs";
    let window_label = "forum";
    let post_js = generate_post_form_js(login_url, &uid, &auth);

    if let Some(window) = app.get_webview_window(window_label) {
        window.eval(&post_js).map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let app_handle = app.clone();
    let blank_url: Url = "about:blank"
        .parse()
        .map_err(|error: url::ParseError| error.to_string())?;
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::External(blank_url),
    )
    .title("Upkk 社区论坛")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .center()
    .user_agent(BROWSER_USER_AGENT)
    .devtools(cfg!(feature = "devtools"))
    .on_page_load(|window, payload| {
        if let tauri::webview::PageLoadEvent::Finished = payload.event() {
            inject_tab_manager(&window, payload.url().as_ref(), "Forum");
        }
    })
    .on_new_window(move |url, _features| {
        deny_popup_and_open_tab(&app_handle, "forum", &url, "Forum");
        tauri::webview::NewWindowResponse::Deny
    })
    .on_navigation(trusted_navigation)
    .build()
    .map_err(|error| error.to_string())?;

    window.eval(&post_js).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_url_in_browser_window(
    app: tauri::AppHandle,
    window_label: String,
    url: String,
    title: String,
) -> Result<(), String> {
    let parsed_url: Url = url
        .parse()
        .map_err(|error: url::ParseError| error.to_string())?;
    if focus_existing_window(&app, &window_label, parsed_url.clone())? {
        return Ok(());
    }

    let app_handle = app.clone();
    let label_clone = window_label.clone();
    tauri::WebviewWindowBuilder::new(&app, &window_label, tauri::WebviewUrl::External(parsed_url))
        .title(&title)
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .center()
        .user_agent(BROWSER_USER_AGENT)
        .devtools(cfg!(feature = "devtools"))
        .on_page_load(|window, payload| {
            if let tauri::webview::PageLoadEvent::Finished = payload.event() {
                inject_tab_manager(&window, payload.url().as_ref(), "Browser");
            }
        })
        .on_new_window(move |url, _features| {
            deny_popup_and_open_tab(&app_handle, &label_clone, &url, "Browser");
            tauri::webview::NewWindowResponse::Deny
        })
        .on_navigation(trusted_navigation)
        .build()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn open_checkin_page(app: tauri::AppHandle) -> Result<(), String> {
    open_url_in_browser_window(
        app,
        "forum".to_string(),
        "https://bbs.upkk.com/plugin.php?id=xnet_core_api:xproj_sign".to_string(),
        "Upkk 社区论坛 - 签到".to_string(),
    )
    .await
}

#[tauri::command]
pub async fn close_window(app: tauri::AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn forum_navigate(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let window = app
        .get_webview_window("forum")
        .ok_or_else(|| "论坛窗口未打开".to_string())?;
    let parsed_url: Url = url
        .parse()
        .map_err(|error: url::ParseError| error.to_string())?;
    window
        .navigate(parsed_url)
        .map_err(|error| error.to_string())
}

fn eval_forum(app: tauri::AppHandle, script: &str) -> Result<(), String> {
    let window = app
        .get_webview_window("forum")
        .ok_or_else(|| "论坛窗口未打开".to_string())?;
    window.eval(script).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn forum_reload(app: tauri::AppHandle) -> Result<(), String> {
    eval_forum(app, "window.location.reload()")
}

#[tauri::command]
pub async fn forum_go_back(app: tauri::AppHandle) -> Result<(), String> {
    eval_forum(app, "window.history.back()")
}

#[tauri::command]
pub async fn forum_go_forward(app: tauri::AppHandle) -> Result<(), String> {
    eval_forum(app, "window.history.forward()")
}

#[tauri::command]
pub async fn forum_get_url(app: tauri::AppHandle) -> Result<String, String> {
    app.get_webview_window("forum")
        .ok_or_else(|| "论坛窗口未打开".to_string())?
        .url()
        .map(|url| url.to_string())
        .map_err(|error| error.to_string())
}
