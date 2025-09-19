// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Konfigurasi untuk React + deploy di subpath /web/
export default defineConfig({
  plugins: [react()],
  base: '/web/', // penting kalau app nanti diakses via domain.com/web/
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsDir: 'assets'
  }
})
