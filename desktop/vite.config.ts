import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Read version from version.txt for consistent versioning across the project
let version = '1.0.0'
try {
  version = fs.readFileSync(path.resolve(__dirname, 'version.txt'), 'utf-8').trim() || '1.0.0'
} catch {
  console.warn('Warning: Could not read version.txt, falling back to default version 1.0.0')
}

// User-Agent configuration for HTTP POST requests (can be overridden via env)
const XPROJ_HTTP_USER_AGENT = process.env.XPROJ_HTTP_USER_AGENT || `XProj-Desktop-HTTP/${version} (+https://servers.upkk.com)`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Compile-time User-Agent configuration for HTTP requests
    '__XPROJ_HTTP_USER_AGENT__': JSON.stringify(XPROJ_HTTP_USER_AGENT),
    // Compile-time app version from version.txt for consistent versioning
    '__XPROJ_APP_VERSION__': JSON.stringify(version),
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
  },
})
