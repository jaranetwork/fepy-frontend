import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
  plugins: [
    vue(),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: 'SIFEN - Sistema de Facturación Electrónica'
        }
      }
    })
  ],
  server: {
    host: '0.0.0.0',  // Permitir acceso desde otros equipos
    port: 3000,
    // Configurar proxy solo para /api/
    proxy: {
      '/api/': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'axios', 'vuetify']
  },
  appType: 'spa',
  base: '/',
  // Fallback para Vue Router
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
