import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { portalApiPlugin } from './vite.portalPlugin.js'

export default defineConfig({
  plugins: [react(), portalApiPlugin()],
})
