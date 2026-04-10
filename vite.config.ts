import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages 需要 /VTools/ 前缀，Vercel 和本地开发使用 /
  base: process.env.GITHUB_ACTIONS ? '/VTools/' : '/',
  server: {
    port: 5173
  }
}))