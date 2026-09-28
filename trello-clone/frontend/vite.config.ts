import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    // バックエンドのCORS許可が 5173 固定のため、使用中でも他のポートへ逃げずに失敗させる
    port: 5173,
    strictPort: true,
    proxy: {
      // ブラウザからは /api/cards で呼び、Vite が /api を外して backend の /cards へ転送する
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
