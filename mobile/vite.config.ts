import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  base: '/app/',  // Served under /app/ on the relay server
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
      '@generative-ui': resolve(__dirname, '../renderer/components/generative-ui'),
    },
  },
  server: {
    port: 3001,
    host: true, // Allow LAN access for mobile testing
  },
  build: {
    outDir: resolve(__dirname, '../relay-server/static'),
    emptyOutDir: true,
  },
})
