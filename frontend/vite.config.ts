/// <reference types="vitest" />
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
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
      },
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
    },
  },
})
