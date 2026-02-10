import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_DEV_PORT || '5008'),
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:5108',
          changeOrigin: true,
        }
      }
    }
  }
})
