import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

const TUNNEL_HOSTS = ['.ngrok-free.app', '.ngrok.app', '.ngrok.io', '.lhr.life', '.localhost.run', '.trycloudflare.com']

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
    ...(process.env.NO_SSL ? [] : [basicSsl()]),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
        // Push handlers live in public/giro-push-sw.js; Workbox owns /sw.js.
        importScripts: ['/giro-push-sw.js'],
      },
      manifest: {
        name: 'GIRO - Stock y Ventas',
        short_name: 'GIRO',
        description: 'Gestión de inventario y punto de venta',
        lang: 'es-AR',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/app/dashboard',
        scope: '/',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Nueva venta', short_name: 'Vender', url: '/app/sales', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Inventario', short_name: 'Stock', url: '/app/inventory', icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
  // Tunnels used to show the app to clients (see docs/MOSTRAR-A-CLIENTE.md).
  preview: {
    host: true,
    allowedHosts: TUNNEL_HOSTS,
  },
  server: {
    host: true,
    allowedHosts: TUNNEL_HOSTS,
    proxy: {
      // Generic /api/* → backend (strips /api prefix)
      '/api': { target: 'http://localhost:4000', changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api/, '') },
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
      '/audit-logs': { target: 'http://localhost:4000', changeOrigin: true },
      '/push': { target: 'http://localhost:4000', changeOrigin: true },
      '/billing': { target: 'http://localhost:4000', changeOrigin: true },
      '/employees': { target: 'http://localhost:4000', changeOrigin: true },
      '/payrolls': { target: 'http://localhost:4000', changeOrigin: true },
      '/accounts-chart': { target: 'http://localhost:4000', changeOrigin: true },
      '/journal': { target: 'http://localhost:4000', changeOrigin: true },
      '/iva-book': { target: 'http://localhost:4000', changeOrigin: true },
      '/accounting-reports': { target: 'http://localhost:4000', changeOrigin: true },
      '/permissions': { target: 'http://localhost:4000', changeOrigin: true },
      '/attributes': { target: 'http://localhost:4000', changeOrigin: true },
      '/customers': { target: 'http://localhost:4000', changeOrigin: true },
      '/suppliers': { target: 'http://localhost:4000', changeOrigin: true },
      '/tax-configs': { target: 'http://localhost:4000', changeOrigin: true },
      '/documents': { target: 'http://localhost:4000', changeOrigin: true },
      '/purchase-orders': { target: 'http://localhost:4000', changeOrigin: true },
      '/stock-counts': { target: 'http://localhost:4000', changeOrigin: true },
      '/batches': { target: 'http://localhost:4000', changeOrigin: true },
      '/accounts-receivable': { target: 'http://localhost:4000', changeOrigin: true },
      '/held-sales': { target: 'http://localhost:4000', changeOrigin: true },
      '/promotions': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
