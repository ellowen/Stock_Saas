import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
