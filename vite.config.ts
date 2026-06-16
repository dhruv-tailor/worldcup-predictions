import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  base: '/worldcup-predictions/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
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
