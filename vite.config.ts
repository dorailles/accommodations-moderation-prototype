import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone single-prototype app. base is set to the repo path at build time by the
// GitHub Pages workflow (BASE_URL=/<repo>/); defaults to '/' for local dev.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_URL || '/',
})
