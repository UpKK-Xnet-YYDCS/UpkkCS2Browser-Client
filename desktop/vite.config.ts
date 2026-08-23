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
          // Separate vendor chunk for React (cached independently by the browser/WebView)
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
          // Separate chunk for Tauri plugins
          if (id.includes('@tauri-apps/plugin-')) {
            return 'tauri';
          }
          // Separate chunk for Tauri core API (used by many pages)
          if (id.includes('@tauri-apps/api')) {
            return 'tauri';
          }
        },
      },
    },
    reportCompressedSize: false,
  },
})
