import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/agents': 'http://localhost:3000',
      '/conversations': 'http://localhost:3000',
    },
  },
})
