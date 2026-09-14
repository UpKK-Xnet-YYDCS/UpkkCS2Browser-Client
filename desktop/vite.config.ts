import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Read the canonical project version and fail before producing inconsistent artifacts.
const versionPath = path.resolve(import.meta.dirname, 'version.txt')
const version = fs.readFileSync(versionPath, 'utf-8').trim()
if (!/^\d+\.\d+\.\d+(?:[+-][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid desktop version in ${versionPath}: ${JSON.stringify(version)}`)
}

// User-Agent configuration for HTTP POST requests (can be overridden via env)
const XPROJ_HTTP_USER_AGENT = process.env.XPROJ_HTTP_USER_AGENT || `XProj-Desktop-HTTP/${version} (+https://servers.upkk.com)`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    // Compile-time User-Agent configuration for HTTP requests
    '__XPROJ_HTTP_USER_AGENT__': JSON.stringify(XPROJ_HTTP_USER_AGENT),
    // Compile-time app version from version.txt for consistent versioning
    '__XPROJ_APP_VERSION__': JSON.stringify(version),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: true,
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          const moduleId = id.replaceAll('\\', '/');
          if (moduleId.includes('node_modules/react-dom') || moduleId.includes('node_modules/react/')) {
            return 'vendor';
          }
          if (moduleId.includes('@tauri-apps/plugin-') || moduleId.includes('@tauri-apps/api')) {
            return 'tauri';
          }
          if (
            moduleId.includes('/src/api/clientConfig.') ||
            moduleId.includes('/src/api/clientQuery.') ||
            moduleId.includes('/src/api/clientPrefetch.') ||
            moduleId.includes('/src/api/client.') ||
            moduleId.includes('/src/services/boundedLru.') ||
            moduleId.includes('/src/services/operationLog.') ||
            moduleId.includes('/src/services/desktopRuntime.')
          ) {
            return 'boot';
          }
          if (
            moduleId.includes('/src/services/forumConstants.') ||
            moduleId.includes('/src/services/forumLoginParse.') ||
            moduleId.includes('/src/services/forumAuthFlow.') ||
            moduleId.includes('/src/services/forumWindow.') ||
            moduleId.includes('/src/services/forumLogin.')
          ) {
            return 'forum';
          }
          if (
            moduleId.includes('/src/components/lucideIcons.') ||
            moduleId.includes('/src/components/JoinServerConfirmModal.') ||
            moduleId.includes('/src/components/JoinServerPickerModal.')
          ) {
            return 'joinUi';
          }
          if (
            moduleId.includes('/src/services/canvasChartHover.') ||
            moduleId.includes('/src/services/canvasLineChart.') ||
            moduleId.includes('/src/components/PlayerHistoryChart.') ||
            moduleId.includes('/src/components/MapHistory.') ||
            moduleId.includes('/src/components/QueryRecords.')
          ) {
            return 'history';
          }
          if (
            moduleId.includes('/src/services/updatePrompt.') ||
            moduleId.includes('/src/services/update.') ||
            moduleId.includes('/src/components/UpdateModal.')
          ) {
            return 'updateUi';
          }
          if (
            moduleId.includes('/src/components/home/AddLocalServerModal.') ||
            moduleId.includes('/src/components/AddServerModal.')
          ) {
            return 'addServer';
          }
        },
      },
    },
    reportCompressedSize: false,
  },
})
