import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GIRO - Stock y Ventas',
        short_name: 'GIRO',
        description: 'Gestión de inventario y punto de venta',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/vite.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    https: true,
    proxy: {
      '/auth': { target: 'http://localhost:4000', changeOrigin: true },
      '/protected': { target: 'http://localhost:4000', changeOrigin: true },
      '/products': { target: 'http://localhost:4000', changeOrigin: true },
      '/inventory': { target: 'http://localhost:4000', changeOrigin: true },
      '/sales': { target: 'http://localhost:4000', changeOrigin: true },
      '/stock-transfers': { target: 'http://localhost:4000', changeOrigin: true },
      '/analytics': { target: 'http://localhost:4000', changeOrigin: true },
      '/branches': { target: 'http://localhost:4000', changeOrigin: true },
      '/users': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
