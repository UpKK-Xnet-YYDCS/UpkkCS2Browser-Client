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
        codeSplitting: {
          groups: [
            // Claim shared dependencies before recursive feature groups can
            // absorb React or the startup client into a lazy dialog chunk.
            { name: 'vendor', test: /node_modules[\\/](?:react-dom|react)[\\/]/, priority: 100 },
            { name: 'tauri', test: /node_modules[\\/]@tauri-apps[\\/]/, priority: 90 },
            { name: 'shell', test: /[\\/]src[\\/]/, tags: ['$initial'], priority: 80 },
            {
              debugName: 'lazyFeatures',
              name(id: string) {
                const moduleId = id.replaceAll('\\', '/');
                if (/\/src\/services\/forum(?:Constants|LoginParse|AuthFlow|Window|Login)\./.test(moduleId)) {
                  return 'forum';
                }
                // Keep server action dialogs together, while the shell owns
                // their shared static dependencies and icons.
                if (/\/src\/components\/(?:lucideIcons|JoinServerConfirmModal|JoinServerPickerModal|AddServerModal|home\/AddLocalServerModal)\./.test(moduleId)) {
                  return 'serverActions';
                }
                if (
                  /\/src\/services\/canvas(?:ChartHover|LineChart)\./.test(moduleId) ||
                  /\/src\/components\/(?:PlayerHistoryChart|MapHistory|QueryRecords)\./.test(moduleId)
                ) {
                  return 'history';
                }
                if (
                  /\/src\/services\/update(?:Prompt)?\./.test(moduleId) ||
                  moduleId.includes('/src/components/UpdateModal.')
                ) {
                  return 'updateUi';
                }
                if (/\/src\/services\/(?:monitorCheck|monitorChannels|monitorChannelPayloads|postMonitorJson)\./.test(moduleId)) {
                  return 'monitorRuntime';
                }
                return null;
              },
            },
          ],
        },
      },
    },
    reportCompressedSize: false,
  },
})
