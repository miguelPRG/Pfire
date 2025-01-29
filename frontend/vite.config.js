import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.VITE_API_URL': process.env.VITE_API_URL, // Variáveis de ambiente públicas
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@tailwindConfig': path.resolve(__dirname, 'tailwind.config.js'), // Alias
    },
  },
  optimizeDeps: {
    include: [], // Remova o @tailwindConfig da otimização
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: false, // Desativa sourcemaps em produção
    outDir: 'dist',
    minify: 'esbuild', // Minificação rápida
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        pure_getters: true, 
        unsafe_comps: true, 
        passes: 2, // Aumenta as passes de compressão
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/backend': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
    },

    watch: {
      usePolling: true,
    },
  },
});
