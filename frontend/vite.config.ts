import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  test: {
    globals: true,
    environment: "jsdom",
    // Sempre que forem criados novos ficheiros de teste, estes devem ser adicionados neste array
    setupFiles: [],
    include: ["src/tests/**/*.{test,spec}.{js,ts,jsx,tsx}"], // 👈 define a pasta dos testes aqui
  },

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
    },
    watch: {
      usePolling: true,
    },
  },
});
