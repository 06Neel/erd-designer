import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
  },
  optimizeDeps: { exclude: ['sql.js'] },
  worker: { format: 'es' },
  server: {
    // Fix 431 Request Header Fields Too Large
    headers: {
      'Cache-Control': 'no-store',
    },
  },
})
