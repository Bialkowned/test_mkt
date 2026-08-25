import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    preview: {
      headers: {
        "X-Frame-Options": "SAMEORIGIN",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss:; frame-ancestors 'self'; base-uri 'self'",
      },
    },
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_DEV_PORT || '5008'),
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:5108',
          changeOrigin: true,
        },
        '/uploads': {
          target: env.VITE_API_TARGET || 'http://localhost:5108',
          changeOrigin: true,
        }
      }
    }
  }
})
