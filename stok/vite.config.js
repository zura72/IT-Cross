import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // KONFIGURASI UNTUK PRODUCTION (VERCEL)
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  base: '/stok/' // Penting untuk deploy di subpath
})