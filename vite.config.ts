import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_GITHUB_PAGES_BASE || '/',
    plugins: [react()],
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['reference/**', 'node_modules/**', 'dist/**'],
    },
  }
})
