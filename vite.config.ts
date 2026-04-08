import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署路径（仓库名）
  base: '/VTools/',
  server: {
    port: 3000,
    open: true
  }
})