import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/joyai-images': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai-uploads': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/upload-images': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/text-to-image': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/edit-image': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/understand-image': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/spatial-transform': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/move-object': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/rotate-object': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/zoom': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/pan-tilt': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/joyai/health': {
        target: 'http://192.168.199.107:8788',
        changeOrigin: true,
      },
      '/flux-api': {
        target: 'http://192.168.199.107:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/flux-api/, ''),
      },
    },
  },
})
