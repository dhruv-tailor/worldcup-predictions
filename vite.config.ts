import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/worldcup-predictions/',
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('/d3-')) {
            return 'vendor-recharts'
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/papaparse') || id.includes('node_modules/html-to-image')) {
            return 'vendor-utils'
          }
        },
      },
    },
  },
})
