use tauri::Manager;
use tauri::Emitter;
use url::Url;
use std::net::UdpSocket;
use std::time::Duration;

// Secure credential storage module
mod secure_storage;

// Browser User-Agent for WebView windows (configured at compile-time via XPROJ_BROWSER_USER_AGENT env var)
// Default: 'XProj-Desktop-Browser/1.0.0 (+https://servers.upkk.com) Chrome/120.0.0.0'
const BROWSER_USER_AGENT: &str = env!("XPROJ_BROWSER_USER_AGENT");

// Forum URL constant - used for forum window and navigation
const FORUM_URL: &str = "https://bbs.upkk.com";

// A2S_INFO query packet (Steam Server Query Protocol)
const A2S_INFO: [u8; 25] = [
    0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6f, 0x75,
    0x72, 0x63, 0x65, 0x20, 0x45, 0x6e, 0x67, 0x69,
    0x6e, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79,
    0x00
];

// A2S query result structure matching the TypeScript ServerStatus interface
#[derive(serde::Serialize, Clone, Debug)]
pub struct A2SQueryResult {
    pub success: bool,
    pub error: Option<String>,
    pub ip: String,
    pub port: String,
    pub name: String,
    pub map_name: String,
    pub game: String,
    pub players: i32,
    pub max_players: i32,
    pub bots: i32,
    pub real_players: i32,
    pub server_type: String,
    pub environment: String,
    pub password: bool,
    pub vac: bool,
    pub version: String,
}

impl Default for A2SQueryResult {
    fn default() -> Self {
        A2SQueryResult {
            success: false,
            error: None,
            ip: String::new(),
            port: String::new(),
            name: String::new(),
            map_name: String::new(),
            game: String::new(),
            players: 0,
            max_players: 0,
            bots: 0,
            real_players: 0,
            server_type: String::new(),
            environment: String::new(),
            password: false,
            vac: false,
            version: String::new(),
        }
    }
}

// Helper function to read null-terminated string from buffer
fn read_cstring(data: &[u8], start: usize) -> (String, usize) {
    let mut end = start;
    while end < data.len() && data[end] != 0 {
        end += 1;
    }
    let s = String::from_utf8_lossy(&data[start..end]).to_string();
    (s, end + 1) // +1 to skip the null terminator
}

// Perform A2S_INFO query to a game server
// This is the local UDP implementation matching the backend Go logic
fn a2s_query(ip: &str, port: &str) -> A2SQueryResult {
    let mut result = A2SQueryResult::default();
    result.ip = ip.to_string();
    result.port = port.to_string();
    
    let address = format!("{}:{}", ip, port);
    
    // Create UDP socket
    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(s) => s,
        Err(e) => {
            result.error = Some(format!("Failed to create socket: {}", e));
            return result;
        }
    };
    
    // Set timeout (5 seconds, matching backend)
    if let Err(e) = socket.set_read_timeout(Some(Duration::from_secs(5))) {
        result.error = Some(format!("Failed to set timeout: {}", e));
        return result;
    }
    
    // Connect to server
    if let Err(e) = socket.connect(&address) {
        result.error = Some(format!("Failed to connect: {}", e));
        return result;
    }
    
    // Send A2S_INFO query
    if let Err(e) = socket.send(&A2S_INFO) {
        result.error = Some(format!("Failed to send query: {}", e));
        return result;
    }
    
    // Receive response
    let mut buf = [0u8; 1400];
    let n = match socket.recv(&mut buf) {
        Ok(n) => n,
        Err(e) => {
            result.error = Some(format!("Failed to receive: {}", e));
            return result;
        }
    };
    
    if n < 6 {
        result.error = Some("Response too short".to_string());
        return result;
    }
    
    // Check header (0xFFFFFFFF)
    if buf[0] != 0xFF || buf[1] != 0xFF || buf[2] != 0xFF || buf[3] != 0xFF {
        result.error = Some("Invalid response header".to_string());
        return result;
    }
    
    // Check if challenge is needed (response type 'A' = 0x41)
    if buf[4] == 0x41 && n >= 9 {
        // Extract challenge number
        let challenge = u32::from_le_bytes([buf[5], buf[6], buf[7], buf[8]]);
        
        // Create challenge request
        let mut challenge_request = A2S_INFO.to_vec();
        challenge_request.extend_from_slice(&challenge.to_le_bytes());
        
        // Send challenge request
        if let Err(e) = socket.send(&challenge_request) {
            result.error = Some(format!("Failed to send challenge: {}", e));
            return result;
        }
        
        // Receive response again
        let n2 = match socket.recv(&mut buf) {
            Ok(n) => n,
            Err(e) => {
                result.error = Some(format!("Failed to receive after challenge: {}", e));
                return result;
            }
        };
        
        if n2 < 6 {
            result.error = Some("Response too short after challenge".to_string());
            return result;
        }
        
        // Check header again
        if buf[0] != 0xFF || buf[1] != 0xFF || buf[2] != 0xFF || buf[3] != 0xFF {
            result.error = Some("Invalid response header after challenge".to_string());
            return result;
        }
    }
    
    // Verify response type 'I' (0x49) for A2S_INFO response
    if buf[4] != 0x49 {
        result.error = Some(format!("Invalid response type: 0x{:02X}", buf[4]));
        return result;
    }
    
    // Parse A2S_INFO response
    // Format: Header(4) + Type(1) + Protocol(1) + Name + Map + Folder + Game + AppID(2) + Players(1) + MaxPlayers(1) + Bots(1) + ...
    let mut pos = 6; // Start after header, type, and protocol byte
    
    // Parse server name
    let (name, next_pos) = read_cstring(&buf, pos);
    result.name = name;
    pos = next_pos;
    
    // Parse map name
    let (map_name, next_pos) = read_cstring(&buf, pos);
    result.map_name = map_name;
    pos = next_pos;
    
    // Parse folder (skip)
    let (_, next_pos) = read_cstring(&buf, pos);
    pos = next_pos;
    
    // Parse game name
    let (game, next_pos) = read_cstring(&buf, pos);
    result.game = game;
    pos = next_pos;
    
    // Parse Steam App ID (2 bytes, little endian) - skip
    if pos + 2 <= buf.len() {
        pos += 2;
    }
    
    // Parse player counts
    if pos + 3 <= buf.len() {
        result.players = buf[pos] as i32;
        pos += 1;
        result.max_players = buf[pos] as i32;
        pos += 1;
        result.bots = buf[pos] as i32;
        pos += 1;
    }
    
    // Parse server type
    if pos < buf.len() {
        result.server_type = match buf[pos] {
            b'd' => "dedicated".to_string(),
            b'l' => "non-dedicated".to_string(),
            b'p' => "sourcetv".to_string(),
            c => format!("{}", c as char),
        };
        pos += 1;
    }
    
    // Parse environment/OS
    if pos < buf.len() {
        result.environment = match buf[pos] {
            b'l' => "Linux".to_string(),
            b'w' => "Windows".to_string(),
            b'm' | b'o' => "Mac".to_string(),
            c => format!("{}", c as char),
        };
        pos += 1;
    }
    
    // Parse visibility (password)
    if pos < buf.len() {
        result.password = buf[pos] != 0;
        pos += 1;
    }
    
    // Parse VAC
    if pos < buf.len() {
        result.vac = buf[pos] != 0;
        pos += 1;
    }
    
    // Parse version string
    if pos < buf.len() {
        let (version, _) = read_cstring(&buf, pos);
        result.version = version;
    }
    
    // Sanitize unreasonable player counts (matching backend logic)
    // CS2/CSGO servers have max 64 player slots; values >67 indicate corrupt/invalid data
    // This matches the Go backend's A2SInfo() sanitization
    if result.max_players > 67 {
        result.players = 0;
        result.max_players = 0;
        result.bots = 0;
    }
    
    // Calculate real players (excluding bots)
    result.real_players = result.players - result.bots;
    if result.real_players < 0 {
        result.real_players = 0;
    }
    
    result.success = true;
    result
}

// Tauri command for A2S query
// This allows the frontend to perform direct UDP queries to game servers
#[tauri::command]
async fn query_server_a2s(ip: String, port: String) -> Result<A2SQueryResult, String> {
    // Run the blocking UDP query in a thread pool to avoid blocking the async runtime
    let result = tokio::task::spawn_blocking(move || {
        a2s_query(&ip, &port)
    }).await.map_err(|e| format!("Query task failed: {}", e))?;
    
    Ok(result)
}

// Escape a string for safe JavaScript embedding
fn escape_js_string(s: &str) -> String {
    s.replace('\\', "\\\\")
     .replace('\'', "\\'")
     .replace('"', "\\\"")
     .replace('\n', "\\n")
     .replace('\r', "\\r")
     .replace('<', "\\x3c")
     .replace('>', "\\x3e")
}

// Generate JavaScript to POST form data to a URL
fn generate_post_form_js(url: &str, uid: &str, auth: &str) -> String {
    let escaped_url = escape_js_string(url);
    let escaped_uid = escape_js_string(uid);
    let escaped_auth = escape_js_string(auth);
    
    format!(
        r#"
        (function() {{
            var form = document.createElement('form');
            form.method = 'POST';
            form.action = '{}';
            
            var uidInput = document.createElement('input');
            uidInput.type = 'hidden';
            uidInput.name = 'uid';
            uidInput.value = '{}';
            form.appendChild(uidInput);
            
            var authInput = document.createElement('input');
            authInput.type = 'hidden';
            authInput.name = 'auth';
            authInput.value = '{}';
            form.appendChild(authInput);
            
            document.body.appendChild(form);
            form.submit();
        }})();
        "#,
        escaped_url, escaped_uid, escaped_auth
    )
}

#[tauri::command]
async fn open_forum_window(app: tauri::AppHandle) -> Result<(), String> {
    open_url_in_browser_window(app, "forum".to_string(), FORUM_URL.to_string(), "Upkk 社区论坛".to_string()).await
}

// JavaScript to create a browser-like multi-tab interface for the forum
// This creates an Edge-like tab bar at the top of the forum window
const FORUM_TAB_MANAGER_JS: &str = r#"
(function() {
    console.log('[XProj] Tab manager script starting, location:', window.location.href);
    
    // Prevent double initialization
    if (window.__xprojTabManager) {
        console.log('[XProj] Already initialized, skipping');
        return;
    }
    window.__xprojTabManager = true;
    console.log('[XProj] Proceeding with initialization');
    
    // Wait for DOM to be ready before initializing
    function initTabManager() {
        console.log('[XProj] initTabManager called, body exists:', !!document.body, 'head exists:', !!document.head);
        
        // Ensure document.body and document.head exist
        if (!document.body || !document.head) {
            // If body/head don't exist yet, wait and try again
            console.log('[XProj] Waiting for DOM...');
            setTimeout(initTabManager, 50);
            return;
        }
        
        try {
        
        // Tab state management
        var tabs = [];
        var activeTabId = null;
        var tabIdCounter = 0;
        var tabHistory = {}; // Store history for each tab
        
        // Inject CSS styles for the tab bar
        var style = document.createElement('style');
        style.textContent = `
        #xproj-tab-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
            border-bottom: 1px solid #dee2e6;
            display: flex;
            align-items: center;
            padding: 0 8px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            user-select: none;
        }
        @media (prefers-color-scheme: dark) {
            #xproj-tab-bar {
                background: linear-gradient(to bottom, #2d3748 0%, #1a202c 100%);
                border-bottom-color: #4a5568;
            }
        }
        #xproj-tabs-container {
            display: flex;
            flex: 1;
            overflow-x: auto;
            gap: 2px;
            padding: 4px 0;
            scrollbar-width: none;
        }
        #xproj-tabs-container::-webkit-scrollbar { display: none; }
        .xproj-tab {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: transparent;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            min-width: 120px;
            max-width: 200px;
            transition: all 0.15s ease;
            position: relative;
        }
        .xproj-tab:hover {
            background: rgba(0,0,0,0.05);
        }
        @media (prefers-color-scheme: dark) {
            .xproj-tab:hover {
                background: rgba(255,255,255,0.05);
            }
        }
        .xproj-tab.active {
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        @media (prefers-color-scheme: dark) {
            .xproj-tab.active {
                background: #4a5568;
            }
        }
        .xproj-tab-title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
            color: #495057;
            text-align: left;
        }
        @media (prefers-color-scheme: dark) {
            .xproj-tab-title { color: #e2e8f0; }
        }
        .xproj-tab-close {
            width: 18px;
            height: 18px;
            border-radius: 4px;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.15s ease;
            color: #6c757d;
            font-size: 16px;
            line-height: 1;
            padding: 0;
        }
        .xproj-tab:hover .xproj-tab-close,
        .xproj-tab.active .xproj-tab-close { opacity: 1; }
        .xproj-tab-close:hover {
            background: rgba(220,53,69,0.1);
            color: #dc3545;
        }
        #xproj-new-tab-btn {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            font-size: 20px;
            margin-left: 4px;
            transition: all 0.15s ease;
        }
        #xproj-new-tab-btn:hover {
            background: rgba(0,0,0,0.05);
            color: #495057;
        }
        @media (prefers-color-scheme: dark) {
            #xproj-new-tab-btn { color: #a0aec0; }
            #xproj-new-tab-btn:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
        }
        #xproj-nav-buttons {
            display: flex;
            gap: 4px;
            margin-right: 8px;
        }
        .xproj-nav-btn {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            font-size: 14px;
            transition: all 0.15s ease;
        }
        .xproj-nav-btn:hover:not(:disabled) {
            background: rgba(0,0,0,0.05);
            color: #495057;
        }
        .xproj-nav-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        @media (prefers-color-scheme: dark) {
            .xproj-nav-btn { color: #a0aec0; }
            .xproj-nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.05); color: #e2e8f0; }
        }
        body { padding-top: 40px !important; }
    `;
    document.head.appendChild(style);
    
    // Create tab bar HTML
    var tabBar = document.createElement('div');
    tabBar.id = 'xproj-tab-bar';
    tabBar.innerHTML = `
        <div id="xproj-nav-buttons">
            <button class="xproj-nav-btn" id="xproj-back-btn" title="后退">◀</button>
            <button class="xproj-nav-btn" id="xproj-forward-btn" title="前进">▶</button>
            <button class="xproj-nav-btn" id="xproj-reload-btn" title="刷新">↻</button>
        </div>
        <div id="xproj-tabs-container"></div>
        <button id="xproj-new-tab-btn" title="新建标签页">+</button>
    `;
    document.body.insertBefore(tabBar, document.body.firstChild);
    
    // Get DOM elements
    var tabsContainer = document.getElementById('xproj-tabs-container');
    var newTabBtn = document.getElementById('xproj-new-tab-btn');
    var backBtn = document.getElementById('xproj-back-btn');
    var forwardBtn = document.getElementById('xproj-forward-btn');
    var reloadBtn = document.getElementById('xproj-reload-btn');
    
    // Helper: Get title from URL
    function getTitleFromUrl(url) {
        try {
            var u = new URL(url);
            if (u.hostname === 'bbs.upkk.com') {
                return 'Upkk 社区论坛';
            }
            return u.hostname;
        } catch(e) {
            return '新标签页';
        }
    }
    
    // Create a new tab
    function createTab(url, switchTo) {
        var id = 'tab_' + (++tabIdCounter);
        var tab = {
            id: id,
            url: url || window.location.href,
            title: getTitleFromUrl(url || window.location.href)
        };
        tabs.push(tab);
        tabHistory[id] = { back: [], forward: [] };
        renderTabs();
        if (switchTo !== false) {
            switchToTab(id);
        }
        return id;
    }
    
    // Switch to a tab
    function switchToTab(tabId) {
        var tab = tabs.find(function(t) { return t.id === tabId; });
        if (!tab) return;
        
        // Save current URL to active tab before switching
        if (activeTabId) {
            var activeTab = tabs.find(function(t) { return t.id === activeTabId; });
            if (activeTab) {
                // Update the tab's URL and title
                if (activeTab.url !== window.location.href) {
                    // Add to back history
                    tabHistory[activeTabId].back.push(activeTab.url);
                    tabHistory[activeTabId].forward = [];
                }
                activeTab.url = window.location.href;
                activeTab.title = document.title || getTitleFromUrl(window.location.href);
            }
        }
        
        activeTabId = tabId;
        renderTabs();
        
        // Navigate to the tab's URL if different
        if (window.location.href !== tab.url) {
            window.location.href = tab.url;
        }
    }
    
    // Close a tab
    function closeTab(tabId, e) {
        if (e) {
            e.stopPropagation();
        }
        
        var tabIndex = tabs.findIndex(function(t) { return t.id === tabId; });
        if (tabIndex === -1) return;
        
        // Don't close the last tab
        if (tabs.length <= 1) {
            return;
        }
        
        tabs.splice(tabIndex, 1);
        delete tabHistory[tabId];
        
        // If closing active tab, switch to adjacent tab
        if (activeTabId === tabId) {
            var newIndex = Math.min(tabIndex, tabs.length - 1);
            switchToTab(tabs[newIndex].id);
        } else {
            renderTabs();
        }
    }
    
    // Render tabs UI
    function renderTabs() {
        tabsContainer.innerHTML = '';
        tabs.forEach(function(tab) {
            var tabEl = document.createElement('button');
            tabEl.className = 'xproj-tab' + (tab.id === activeTabId ? ' active' : '');
            tabEl.innerHTML = `
                <span class="xproj-tab-title">${escapeHtml(tab.title)}</span>
                <button class="xproj-tab-close" title="关闭标签页">×</button>
            `;
            tabEl.onclick = function() { switchToTab(tab.id); };
            tabEl.querySelector('.xproj-tab-close').onclick = function(e) { closeTab(tab.id, e); };
            tabsContainer.appendChild(tabEl);
        });
        updateNavButtons();
    }
    
    // Update navigation button states
    function updateNavButtons() {
        var history = tabHistory[activeTabId] || { back: [], forward: [] };
        backBtn.disabled = history.back.length === 0;
        forwardBtn.disabled = history.forward.length === 0;
    }
    
    // Escape HTML
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // Navigation buttons handlers
    backBtn.onclick = function() {
        var history = tabHistory[activeTabId];
        if (history && history.back.length > 0) {
            history.forward.push(window.location.href);
            var url = history.back.pop();
            var tab = tabs.find(function(t) { return t.id === activeTabId; });
            if (tab) tab.url = url;
            window.location.href = url;
        }
    };
    
    forwardBtn.onclick = function() {
        var history = tabHistory[activeTabId];
        if (history && history.forward.length > 0) {
            history.back.push(window.location.href);
            var url = history.forward.pop();
            var tab = tabs.find(function(t) { return t.id === activeTabId; });
            if (tab) tab.url = url;
            window.location.href = url;
        }
    };
    
    reloadBtn.onclick = function() {
        window.location.reload();
    };
    
    // New tab button handler
    newTabBtn.onclick = function() {
        createTab('https://bbs.upkk.com', true);
    };
    
    // Initialize with current page as first tab
    createTab(window.location.href, true);
    
    // Update tab title when page loads
    window.addEventListener('load', function() {
        var tab = tabs.find(function(t) { return t.id === activeTabId; });
        if (tab) {
            tab.title = document.title || getTitleFromUrl(window.location.href);
            tab.url = window.location.href;
            renderTabs();
        }
    });
    
    // Intercept target="_blank" links to open in new tab
    document.addEventListener('click', function(e) {
        var anchor = e.target.closest('a');
        if (!anchor) return;
        
        var href = anchor.getAttribute('href');
        var target = anchor.getAttribute('target');
        
        if (target === '_blank' && href) {
            e.preventDefault();
            e.stopPropagation();
            
            // Resolve relative URLs
            var fullUrl = href;
            if (href.startsWith('/')) {
                fullUrl = window.location.origin + href;
            } else if (!href.startsWith('http://') && !href.startsWith('https://')) {
                fullUrl = new URL(href, window.location.href).href;
            }
            
            // Open in new tab
            createTab(fullUrl, true);
        }
    }, true);
    
    // Override window.open to open in new tab
    var originalOpen = window.open;
    window.open = function(url, target, features) {
        if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
            var fullUrl = url;
            if (url.startsWith('/')) {
                fullUrl = window.location.origin + url;
            }
            createTab(fullUrl, true);
            return window;
        }
        return originalOpen.call(window, url, target, features);
    };
    
    // Expose API for Tauri to interact with tabs
    window.__xprojTabs = {
        createTab: createTab,
        closeTab: closeTab,
        switchToTab: switchToTab,
        getTabs: function() { return tabs; },
        getActiveTabId: function() { return activeTabId; }
    };
    
    console.log('[XProj] Forum tab manager initialized');
    } catch(e) {
        console.error('[XProj] Error initializing tab manager:', e);
    }
    } // End of initTabManager function
    
    // Start initialization - wait for DOM if needed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTabManager);
    } else {
        initTabManager();
    }
})();
"#;

#[tauri::command]
async fn open_forum_with_login(app: tauri::AppHandle, uid: String, auth: String) -> Result<(), String> {
    // The login endpoint that accepts POST data
    let login_url = "https://bbs.upkk.com/plugin.php?id=xnet_core_api:xproj_login_to_bbs";
    let window_label = "forum";
    let title = "Upkk 社区论坛";
    
    // Generate the POST form JavaScript with properly escaped values
    let post_js = generate_post_form_js(login_url, &uid, &auth);
    
    // Check if window already exists
    if let Some(window) = app.get_webview_window(window_label) {
        // Window exists - execute JavaScript to POST login data
        window.eval(&post_js).map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    
    // Clone app handle for use in the on_new_window closure
    let app_handle = app.clone();
    
    // Create a new webview window - start with a blank page, then POST
    let blank_url: Url = "about:blank".parse().map_err(|e: url::ParseError| e.to_string())?;
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::External(blank_url),
    )
    .title(title)
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .center()
    .user_agent(BROWSER_USER_AGENT)
    .devtools(cfg!(feature = "devtools"))
    // Inject JavaScript for multi-tab browser interface on page load
    // Note: initialization_script only runs on the first page, so we use on_page_load
    // to inject the script on every navigation
    .on_page_load(|window, payload| {
        // Only inject on Started event (page started loading) or Finished
        // We use Finished to ensure DOM is ready
        if let tauri::webview::PageLoadEvent::Finished = payload.event() {
            let url = payload.url().to_string();
            // Skip about:blank
            if url != "about:blank" {
                println!("[Forum] Page loaded: {}, injecting tab manager", url);
                // Inject the tab manager script
                if let Err(e) = window.eval(FORUM_TAB_MANAGER_JS) {
                    eprintln!("[Forum] Failed to inject tab manager: {}", e);
                }
            }
        }
    })
    // Handle new window requests (target="_blank" / window.open)
    // Open in new tab via the injected tab manager
    .on_new_window(move |url, _features| {
        // Log the new window request for debugging
        println!("[Forum] New window request intercepted: {}", url);
        
        // Get the forum window and create a new tab
        if let Some(forum_window) = app_handle.get_webview_window("forum") {
            // Use the tab manager API to create a new tab
            // Important: Escape backslashes first, then single quotes to prevent injection
            let create_tab_js = format!("if(window.__xprojTabs) window.__xprojTabs.createTab('{}', true);", 
                url.as_str().replace('\\', "\\\\").replace('\'', "\\'"));
            if let Err(e) = forum_window.eval(&create_tab_js) {
                eprintln!("[Forum] Failed to create new tab: {}", e);
            }
        }
        
        // Deny opening a new window - we created a new tab instead
        tauri::webview::NewWindowResponse::Deny
    })
    // Allow navigation within the forum WebView window
    // Only allow navigation to trusted domains for security
    .on_navigation(|url| {
        let url_str = url.as_str();
        // Allow about:blank for initial page and forum domain
        url_str.starts_with("about:") ||
        url_str.starts_with("https://bbs.upkk.com") ||
        url_str.starts_with("http://bbs.upkk.com") ||
        url_str.starts_with("https://servers.upkk.com") ||
        url_str.starts_with("http://servers.upkk.com")
    })
    .build()
    .map_err(|e| e.to_string())?;
    
    // Execute the POST form submit
    window.eval(&post_js).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn open_url_in_browser_window(app: tauri::AppHandle, window_label: String, url: String, title: String) -> Result<(), String> {
    // Check if window already exists
    if let Some(window) = app.get_webview_window(&window_label) {
        // Navigate to the new URL
        let parsed_url: Url = url.parse().map_err(|e: url::ParseError| e.to_string())?;
        window.navigate(parsed_url).map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    
    // Clone app handle and window_label for use in the on_new_window closure
    let app_handle = app.clone();
    let label_clone = window_label.clone();
    
    // Create a new webview window with full WebView2 capabilities
    let parsed_url: Url = url.parse().map_err(|e: url::ParseError| e.to_string())?;
    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_label,
        tauri::WebviewUrl::External(parsed_url),
    )
    .title(&title)
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .center()
    .user_agent(BROWSER_USER_AGENT)
    .devtools(cfg!(feature = "devtools"))
    // Inject JavaScript for multi-tab browser interface on page load
    .on_page_load(|window, payload| {
        if let tauri::webview::PageLoadEvent::Finished = payload.event() {
            let url = payload.url().to_string();
            if url != "about:blank" {
                println!("[Browser] Page loaded: {}, injecting tab manager", url);
                if let Err(e) = window.eval(FORUM_TAB_MANAGER_JS) {
                    eprintln!("[Browser] Failed to inject tab manager: {}", e);
                }
            }
        }
    })
    // Handle new window requests (target="_blank" / window.open)
    // Open in new tab via the injected tab manager
    .on_new_window(move |url, _features| {
        // Log the new window request for debugging
        println!("[Browser] New window request intercepted: {}", url);
        
        // Get the window and create a new tab
        if let Some(browser_window) = app_handle.get_webview_window(&label_clone) {
            // Use the tab manager API to create a new tab
            // Important: Escape backslashes first, then single quotes to prevent injection
            let create_tab_js = format!("if(window.__xprojTabs) window.__xprojTabs.createTab('{}', true);", 
                url.as_str().replace('\\', "\\\\").replace('\'', "\\'"));
            if let Err(e) = browser_window.eval(&create_tab_js) {
                eprintln!("[Browser] Failed to create new tab: {}", e);
            }
        }
        
        // Deny opening a new window - we created a new tab instead
        tauri::webview::NewWindowResponse::Deny
    })
    // Allow navigation within external browser windows
    // Only allow navigation to trusted domains for security
    .on_navigation(|url| {
        let url_str = url.as_str();
        // Allow about:blank and upkk domains
        url_str.starts_with("about:") ||
        url_str.starts_with("https://bbs.upkk.com") ||
        url_str.starts_with("http://bbs.upkk.com") ||
        url_str.starts_with("https://servers.upkk.com") ||
        url_str.starts_with("http://servers.upkk.com")
    })
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn open_steam_login(app: tauri::AppHandle, login_url: String) -> Result<(), String> {
    // Open OAuth/OpenID login in a dedicated WebView2 window
    let window_label = "steam_login";
    
    // Check if window already exists
    if let Some(window) = app.get_webview_window(window_label) {
        let parsed_url: Url = login_url.parse().map_err(|e: url::ParseError| e.to_string())?;
        window.navigate(parsed_url).map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    
    let app_handle = app.clone();
    
    // Create a new webview window for OAuth login
    // The backend will redirect to xproj://auth/callback?token=XXX after successful login
    // We intercept this URL in on_navigation to extract the token
    let parsed_url: Url = login_url.parse().map_err(|e: url::ParseError| e.to_string())?;
    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::External(parsed_url),
    )
    .title("Login")
    .inner_size(900.0, 700.0)
    .min_inner_size(600.0, 500.0)
    .center()
    .user_agent(BROWSER_USER_AGENT)
    .on_navigation(move |url| {
        let url_str = url.to_string();
        
        // Intercept xproj:// custom URL scheme - this carries the API token from backend
        if url_str.starts_with("xproj://auth/callback") {
            println!("[Login] Token redirect intercepted: {}", url_str);
            
            // Parse query params to extract token and user info
            if let Ok(parsed) = url::Url::parse(&url_str) {
                let params: std::collections::HashMap<String, String> = parsed.query_pairs()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect();
                
                if let Some(token) = params.get("token") {
                    // Build JSON payload with token and user info
                    let user_json = serde_json::json!({
                        "token": token,
                        "user": {
                            "id": params.get("user_id").and_then(|v| v.parse::<u64>().ok()).unwrap_or(0),
                            "username": params.get("username").unwrap_or(&String::new()),
                            "avatar_url": params.get("avatar_url").unwrap_or(&String::new()),
                            "provider": params.get("provider").unwrap_or(&String::new()),
                        }
                    });
                    
                    let payload = user_json.to_string();
                    println!("[Login] Emitting login-token-ready event");
                    let _ = app_handle.emit("login-token-ready", payload);
                    
                    // Close the login window after a short delay
                    let app_close = app_handle.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(300));
                        if let Some(win) = app_close.get_webview_window("steam_login") {
                            let _ = win.close();
                        }
                    });
                }
            }
            
            // Prevent navigation to xproj:// (not a real URL)
            return false;
        }
        
        // Allow all other navigation (OAuth provider redirects)
        true
    })
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn open_checkin_page(app: tauri::AppHandle) -> Result<(), String> {
    // Open the check-in page directly in the forum WebView2 window
    // This allows the check-in to use the forum's cookies/session
    let checkin_url = "https://bbs.upkk.com/plugin.php?id=xnet_core_api:xproj_sign".to_string();
    open_url_in_browser_window(app, "forum".to_string(), checkin_url, "Upkk 社区论坛 - 签到".to_string()).await
}

#[tauri::command]
async fn close_window(app: tauri::AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn forum_navigate(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("forum") {
        let parsed_url: Url = url.parse().map_err(|e: url::ParseError| e.to_string())?;
        window.navigate(parsed_url).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("论坛窗口未打开".to_string())
    }
}

#[tauri::command]
async fn forum_reload(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("forum") {
        window.eval("window.location.reload()").map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("论坛窗口未打开".to_string())
    }
}

#[tauri::command]
async fn forum_go_back(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("forum") {
        window.eval("window.history.back()").map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("论坛窗口未打开".to_string())
    }
}

#[tauri::command]
async fn forum_go_forward(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("forum") {
        window.eval("window.history.forward()").map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("论坛窗口未打开".to_string())
    }
}

#[tauri::command]
async fn forum_get_url(app: tauri::AppHandle) -> Result<String, String> {
    if let Some(window) = app.get_webview_window("forum") {
        window.url().map(|u| u.to_string()).map_err(|e| e.to_string())
    } else {
        Err("论坛窗口未打开".to_string())
    }
}

#[tauri::command]
async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    // Only allow writing .json files (used for favorites export)
    match p.extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("json") => {}
        _ => return Err("Only .json files are allowed".to_string()),
    }
    std::fs::write(p, contents).map_err(|e| format!("Failed to write file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
        open_forum_window,
        open_forum_with_login,
        open_url_in_browser_window,
        open_steam_login,
        open_checkin_page,
        close_window,
        forum_navigate,
        forum_reload,
        forum_go_back,
        forum_go_forward,
        forum_get_url,
        query_server_a2s,
        // Secure credential storage commands
        secure_storage::save_credentials,
        secure_storage::load_credentials,
        secure_storage::clear_credentials,
        secure_storage::get_device_fingerprint,
        secure_storage::has_stored_credentials,
        write_text_file
    ])
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
