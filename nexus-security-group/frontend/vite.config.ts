import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: 80,
    host: true,
    proxy: {
      '/api': {
        target: 'http://dashboard-api:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
