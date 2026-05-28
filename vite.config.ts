import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api/generate': {
        target: 'http://192.168.199.107:7860',
        changeOrigin: true,
      },
      '/api/refine': {
        target: 'http://192.168.199.107:7860',
        changeOrigin: true,
      },
      '/joyai-images': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai-uploads': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/flux-api': {
        target: 'http://192.168.199.107:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/flux-api/, ''),
      },
      '/ernie-api': {
        target: 'http://192.168.199.107:30000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ernie-api/, ''),
      },
      '/ernie-images': {
        target: 'http://192.168.199.107:30000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ernie-images/, ''),
      },
      '/qwen-api': {
        target: 'http://192.168.199.107:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/qwen-api/, ''),
      },
      '/qwen-images': {
        target: 'http://192.168.199.107:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/qwen-images/, ''),
      },
      '/api/history': {
        target: 'http://localhost:8789',
        changeOrigin: true,
      },
    },
  },
})
