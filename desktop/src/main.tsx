import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Prevent right-click context menu and page-reload shortcuts in Tauri desktop app.
// Right-click refresh reloads the entire app, which re-triggers map monitoring
// and resets in-memory state (cooldowns, consecutive match tracking, etc.).
if ('__TAURI_INTERNALS__' in window) {
  // Disable browser context menu (which contains "Reload" option)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Block F5 / Ctrl+R / Cmd+R to prevent accidental page reload
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F5' ||
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')
    ) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
