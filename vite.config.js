import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [tailwindcss(), vue(), ...(mode !== 'production' ? [vueDevTools()] : [])],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        https: false,
        allowedHosts: true,
        hmr: {
            protocol: 'wss'
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/functions', 'firebase/auth'],
                    'vendor-liff': ['@line/liff'],
                    'vendor-misc': ['date-fns', 'pinia', 'vue-router'],
                }
            }
        }
    }
}))
