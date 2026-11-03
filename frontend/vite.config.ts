import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      watch: { usePolling: env.CHOKIDAR_USEPOLLING === 'true' },
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
