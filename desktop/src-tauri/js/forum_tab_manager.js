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
