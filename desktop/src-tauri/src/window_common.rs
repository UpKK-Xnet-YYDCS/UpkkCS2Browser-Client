use tauri::Manager;
use url::Url;

pub(crate) const BROWSER_USER_AGENT: &str = env!("XPROJ_BROWSER_USER_AGENT");

pub(crate) fn focus_existing_window(
    app: &tauri::AppHandle,
    label: &str,
    url: Url,
) -> Result<bool, String> {
    let Some(window) = app.get_webview_window(label) else {
        return Ok(false);
    };
    window.navigate(url).map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(true)
}
