import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: [], // Remova o @tailwindConfig da otimização
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: false, // Desativa sourcemaps em produção
    outDir: "dist",
    minify: "esbuild", // Minificação rápida
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
      "/backend": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ""),
      },
      "^/backend": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ""),
      },
    },

    watch: {
      usePolling: true,
    },
  },
});
