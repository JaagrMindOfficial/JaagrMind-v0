import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    },
    // Strip console.log and debugger in production builds
    esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : []
    }
}))
