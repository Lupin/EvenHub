import { defineConfig } from 'vite'
import { cpSync } from 'node:fs'

export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
  },
  plugins: [{
    name: 'copy-static',
    closeBundle() {
      // Copy static assets needed for Even Hub packaging
      cpSync('icon.png', 'dist/icon.png')
      cpSync('even-hub.json', 'dist/even-hub.json')
      cpSync('src/phone-config/settings.html', 'dist/settings.html')
    }
  }]
})
