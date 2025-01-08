import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env': process.env, // Defina as variáveis de ambiente se necessário
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@tailwindConfig': path.resolve(__dirname, 'tailwind.config.js'), // Alias, se necessário
    },
  },
  optimizeDeps: {
    include: [
      '@tailwindConfig', // Depêndencia otimizada para incluir no build
    ],
  },
  build: {
    // Configurações para produção
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: false, // Desativa sourcemaps em produção
    outDir: 'dist', // Diretório de saída
    minify: 'esbuild', // Minificação rápida com esbuild
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log no build de produção
      },
    },
  },
  
  server: {
    // Configurações de servidor para desenvolvimento
    port: 3000,  // Porta para o servidor de desenvolvimento
    open: true,  // Abre o navegador automaticamente
    proxy: {
      '/backend': {
        target: 'http://localhost:8000', // Redireciona para o back-end
        changeOrigin: true,  // Pode ser útil se estiver configurando domínios diferentes
        rewrite: (path) => path.replace(/^\/backend/, ''), // Remove o prefixo /backend
      },
    },
  },
})
